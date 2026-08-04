"""
MedIntel AI — AI Chat Endpoint (RAG + Gemini Flash LLM)
The core AI engine: RAG pipeline, safety guardrails, citations, voice support.
"""

import json
import logging
import re
from typing import Optional, List
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from fastapi import APIRouter, UploadFile, File, Form, status
from pydantic import BaseModel

import google.generativeai as genai
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.exceptions import LLMResponseError, VoiceServiceError, SafetyGuardrailTriggered
from app.infrastructure.models.conversation_model import (
    ConversationDocument,
    MessageDocument,
    MessageRole,
)
from app.infrastructure.models.medicine_model import MedicineDocument
from app.api.dependencies import CurrentUser

router = APIRouter(prefix="/conversations", tags=["AI Chat Assistant"])

# Configure AI clients
genai.configure(api_key=settings.GEMINI_API_KEY)
deepseek_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY,
    base_url=settings.DEEPSEEK_BASE_URL,
    timeout=3.0,
    max_retries=0,
)
_deepseek_disabled_until = 0

# ── Safety Guardrails ─────────────────────────────────────────────────────────

BLOCKED_INTENTS = [
    "i diagnose you with", "you are suffering from",
    "i prescribe you", "i am prescribing",
    "stop taking your medication immediately",
    "double your dose without doctor",
]

def _check_safety_guardrails(response_text: str) -> None:
    """
    Scan LLM output for explicit diagnostic or prescriptive language.
    Raises SafetyGuardrailTriggered if detected.
    """
    response_lower = response_text.lower()
    for phrase in BLOCKED_INTENTS:
        if phrase in response_lower:
            raise SafetyGuardrailTriggered()


# ── System Prompt ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are MedIntel AI, a caring and knowledgeable medication assistant.

YOUR CORE RESPONSIBILITIES:
1. Explain what medicines are, what they are used for, how they work, and key precautions — in simple, friendly, easy-to-understand language.
2. If asked about a medicine (such as Metformin, Paracetamol, Aspirin, Lisinopril, etc.), clearly explain:
   - What the medicine is used for
   - How it works in the body
   - Common side effects or key safety precautions
3. Keep your explanation helpful, clear, structured, and informative.

SAFETY RULE:
- Always end your response with:
  "⚠️ Note: This information is for educational purposes only. Always consult your doctor or pharmacist for personal medical advice."
"""


async def _retrieve_context(query: str, medicine_id: Optional[str] = None) -> str:
    """
    Simple RAG: retrieve relevant medicine information from MongoDB.
    Uses stop-word filtering and multi-field regex search over master catalogue.
    """
    context_parts = []

    if medicine_id:
        medicine = await MedicineDocument.get(medicine_id)
        if medicine:
            context_parts.append(
                f"MEDICINE: {medicine.name} ({medicine.generic_name})\n"
                f"CLASS: {medicine.drug_class}\n"
                f"WHAT IT DOES: {medicine.description}\n"
                f"HOW IT WORKS: {medicine.mechanism_of_action or 'Not available'}\n"
                f"USED FOR: {medicine.indications or 'Not available'}\n"
                f"SIDE EFFECTS: {json.dumps(medicine.side_effects)}\n"
                f"PRECAUTIONS: {medicine.precautions or 'None listed'}\n"
                f"ELDERLY WARNINGS: {medicine.elderly_warnings or 'None specific'}\n"
                f"FOOD INTERACTIONS: {', '.join(medicine.food_interactions) or 'None known'}\n"
                f"SOURCE: {medicine.data_source} — {medicine.source_url or 'FDA/RxNorm database'}"
            )

    # Keyword RAG search with stop-word filter
    if not context_parts:
        STOP_WORDS = {
            "what", "does", "how", "when", "where", "which", "who", "why",
            "is", "are", "can", "could", "should", "would", "do", "did",
            "take", "used", "for", "the", "a", "an", "and", "or", "in",
            "on", "at", "to", "from", "with", "about", "this", "that",
            "these", "those", "tell", "me", "give", "info", "information", "work"
        }
        words = [w for w in re.split(r'\W+', query) if len(w) >= 3 and w.lower() not in STOP_WORDS]

        medicines = []
        # Try matching candidate medicine words
        for term in words:
            found = await MedicineDocument.find(
                {
                    "$or": [
                        {"name": {"$regex": term, "$options": "i"}},
                        {"generic_name": {"$regex": term, "$options": "i"}},
                        {"search_keywords": {"$regex": term, "$options": "i"}},
                        {"description": {"$regex": term, "$options": "i"}},
                    ]
                }
            ).limit(3).to_list()
            if found:
                medicines.extend(found)
                break

        # Fallback if text search index is configured
        if not medicines:
            try:
                medicines = await MedicineDocument.find({"$text": {"$search": query}}).limit(3).to_list()
            except Exception:
                pass

        for m in medicines:
            context_parts.append(
                f"MEDICINE: {m.name} ({m.generic_name})\n"
                f"CLASS: {m.drug_class}\n"
                f"WHAT IT DOES: {m.description}\n"
                f"HOW IT WORKS: {m.mechanism_of_action or 'Not available'}\n"
                f"USED FOR: {m.indications or 'Not available'}\n"
                f"SIDE EFFECTS: {json.dumps(m.side_effects)}\n"
                f"PRECAUTIONS: {m.precautions or 'None listed'}\n"
                f"ELDERLY WARNINGS: {m.elderly_warnings or 'None specific'}"
            )

    return "\n\n---\n\n".join(context_parts) if context_parts else "No specific medicine context available."


async def _generate_ai_response(
    user_message: str,
    context: str,
    history: List[dict],
    language: str = "en",
) -> tuple[str, List[dict]]:
    """
    Generate AI response using DeepSeek API (or Gemini Flash fallback) with RAG context.
    Returns (response_text, citations).
    """
    global _deepseek_disabled_until
    import time

    language_instruction = ""
    if language != "en":
        lang_names = {
            "hi": "Hindi", "bn": "Bengali", "te": "Telugu", "mr": "Marathi",
            "ta": "Tamil", "gu": "Gujarati", "kn": "Kannada", "ml": "Malayalam",
        }
        lang_name = lang_names.get(language, "English")
        language_instruction = f"\n\nIMPORTANT: Respond in {lang_name}. Keep medical terms in English but explain them in {lang_name}."

    full_prompt = f"""{SYSTEM_PROMPT}{language_instruction}

RETRIEVED MEDICAL CONTEXT (from verified database):
{context}

CONVERSATION HISTORY:
{chr(10).join([f"{m['role'].upper()}: {m['content']}" for m in history[-6:]])}

USER QUESTION: {user_message}

Please provide a helpful, safe, and accurate response based on the context above.
Remember: Do NOT diagnose or prescribe. End with the safety disclaimer."""

    # Prepare citations
    citations = []
    if "FDA" in context or "openfda" in context.lower():
        citations.append({
            "source": "FDA Drug Database",
            "url": "https://api.fda.gov/drug",
            "excerpt": "Drug information from the US Food and Drug Administration",
        })

    # 1. Try DeepSeek if available
    current_time = time.time()
    if (
        settings.DEEPSEEK_API_KEY
        and settings.DEEPSEEK_API_KEY != "your-deepseek-api-key-here"
        and current_time > _deepseek_disabled_until
    ):
        try:
            response = await deepseek_client.chat.completions.create(
                model=settings.DEEPSEEK_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT + language_instruction},
                    {"role": "user", "content": f"RETRIEVED CONTEXT:\n{context}\n\nUSER QUESTION: {user_message}"},
                ],
                temperature=settings.GEMINI_TEMPERATURE,
            )
            if response and response.choices and response.choices[0].message.content:
                return response.choices[0].message.content, citations
        except Exception as deepseek_err:
            logger.warning(f"⚠️ DeepSeek API call failed ({deepseek_err}). Disabling DeepSeek for 10 min.")
            _deepseek_disabled_until = current_time + 600

    # 2. Try Gemini Models with Fallbacks
    gemini_models = [settings.GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro"]
    for model_name in gemini_models:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=settings.GEMINI_TEMPERATURE,
                    max_output_tokens=settings.GEMINI_MAX_OUTPUT_TOKENS,
                ),
            )
            if response and response.text:
                return response.text, citations
        except Exception as gem_err:
            logger.warning(f"⚠️ Gemini model '{model_name}' call failed: {gem_err}")

    # 3. Graceful Clinical Knowledge Fallback (if all AI APIs are rate limited)
    logger.info("ℹ️ All cloud AI models quota limited. Using verified clinical database fallback.")
    fallback_text = (
        f"Here is verified medication information regarding your query (**{user_message}**):\n\n"
        f"{context}\n\n"
        f"⚠️ Note: This information is for educational purposes only. Always consult your doctor or pharmacist for personal medical advice."
    )
    return fallback_text, citations


# ── Request / Response Schemas ────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    medicine_id: Optional[str] = None  # Context: asking about a specific medicine


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str
    response: str
    citations: List[dict]
    is_flagged: bool = False


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/chat",
    status_code=status.HTTP_201_CREATED,
    summary="Send a message to the AI medication assistant",
)
async def chat(
    body: ChatRequest,
    current_user: CurrentUser,
) -> dict:
    """
    The primary AI chat endpoint. Uses RAG to ground responses in
    verified medical data, then generates a simple explanation using
    Gemini Flash. Safety guardrails prevent diagnostic/prescriptive responses.
    """
    # Get or create conversation
    if body.conversation_id:
        conversation = await ConversationDocument.get(body.conversation_id)
    else:
        conversation = ConversationDocument(
            user_id=str(current_user.id),
            title=body.message[:60] + ("..." if len(body.message) > 60 else ""),
            context_medicine_id=body.medicine_id,
        )
        await conversation.insert()

    # Load conversation history for context
    history_docs = await MessageDocument.find(
        MessageDocument.conversation_id == str(conversation.id)
    ).sort(+MessageDocument.created_at).limit(10).to_list()

    history = [
        {"role": msg.role.value, "content": msg.content}
        for msg in history_docs
    ]

    # Save user message
    user_msg = MessageDocument(
        conversation_id=str(conversation.id),
        user_id=str(current_user.id),
        role=MessageRole.USER,
        content=body.message,
    )
    await user_msg.insert()

    # RAG: retrieve relevant context
    context = await _retrieve_context(body.message, body.medicine_id)

    # Generate AI response
    response_text, citations = await _generate_ai_response(
        user_message=body.message,
        context=context,
        history=history,
        language=current_user.language_pref.value,
    )

    # Safety check
    is_flagged = False
    try:
        _check_safety_guardrails(response_text)
    except SafetyGuardrailTriggered as e:
        response_text = e.message
        is_flagged = True

    # Save assistant message
    assistant_msg = MessageDocument(
        conversation_id=str(conversation.id),
        user_id=str(current_user.id),
        role=MessageRole.ASSISTANT,
        content=response_text,
        citations=citations,
        model_version=settings.GEMINI_MODEL,
        is_flagged=is_flagged,
    )
    await assistant_msg.insert()

    # Update conversation timestamp
    conversation.last_message_at = datetime.now(timezone.utc)
    await conversation.save()

    return {
        "success": True,
        "message": "Response generated",
        "data": ChatResponse(
            conversation_id=str(conversation.id),
            message_id=str(assistant_msg.id),
            response=response_text,
            citations=citations,
            is_flagged=is_flagged,
        ).model_dump(),
    }


@router.post(
    "/voice",
    summary="Convert speech to text, then chat with AI",
)
async def voice_chat(
    current_user: CurrentUser,
    audio: UploadFile = File(..., description="Audio file (mp3, wav, webm, m4a)"),
    conversation_id: Optional[str] = Form(default=None),
    medicine_id: Optional[str] = Form(default=None),
) -> dict:
    """
    Voice-first AI interaction:
    1. Transcribe audio using OpenAI Whisper-1
    2. Process the transcript as a chat message
    3. Generate AI response
    4. Optionally synthesize voice response (client requests /tts endpoint)
    """
    ALLOWED_AUDIO = {"audio/mpeg", "audio/wav", "audio/webm", "audio/mp4", "audio/m4a"}
    if audio.content_type not in ALLOWED_AUDIO:
        raise VoiceServiceError(message="Unsupported audio format. Please use MP3, WAV, or WebM.")

    # Transcribe with Whisper
    try:
        audio_content = await audio.read()
        transcription = await openai_client.audio.transcriptions.create(
            model=settings.OPENAI_STT_MODEL,
            file=(audio.filename or "audio.webm", audio_content, audio.content_type),
            language=current_user.language_pref.value if current_user.language_pref.value != "en" else None,
        )
        transcript = transcription.text
    except Exception as e:
        raise VoiceServiceError(message=f"Speech transcription failed: {str(e)}")

    if not transcript.strip():
        return {
            "success": False,
            "message": "No speech detected in the audio. Please try again.",
            "data": None,
        }

    # Re-use the chat logic
    from fastapi import Request
    chat_body = ChatRequest(
        message=transcript,
        conversation_id=conversation_id,
        medicine_id=medicine_id,
    )

    # Delegate to chat handler (inline to avoid HTTP overhead)
    context = await _retrieve_context(transcript, medicine_id)
    conversation = None
    if conversation_id:
        conversation = await ConversationDocument.get(conversation_id)
    if not conversation:
        conversation = ConversationDocument(
            user_id=str(current_user.id),
            title=transcript[:60],
        )
        await conversation.insert()

    history_docs = await MessageDocument.find(
        MessageDocument.conversation_id == str(conversation.id)
    ).sort(+MessageDocument.created_at).limit(6).to_list()
    history = [{"role": m.role.value, "content": m.content} for m in history_docs]

    response_text, citations = await _generate_ai_response(
        transcript, context, history, current_user.language_pref.value
    )

    is_flagged = False
    try:
        _check_safety_guardrails(response_text)
    except SafetyGuardrailTriggered as e:
        response_text = e.message
        is_flagged = True

    assistant_msg = MessageDocument(
        conversation_id=str(conversation.id),
        user_id=str(current_user.id),
        role=MessageRole.ASSISTANT,
        content=response_text,
        citations=citations,
        is_flagged=is_flagged,
    )
    await assistant_msg.insert()

    return {
        "success": True,
        "message": "Voice query processed",
        "data": {
            "transcript": transcript,
            "conversation_id": str(conversation.id),
            "response": response_text,
            "citations": citations,
        },
    }


@router.post(
    "/tts",
    summary="Convert AI response text to speech (OpenAI TTS)",
)
async def text_to_speech(
    text: str = Form(..., max_length=4096),
    current_user: CurrentUser = None,
):
    """
    Convert a text response to audio using OpenAI TTS.
    Returns audio/mpeg binary stream for the client to play.
    """
    from fastapi.responses import StreamingResponse
    import io

    try:
        response = await openai_client.audio.speech.create(
            model=settings.OPENAI_TTS_MODEL,
            voice=settings.OPENAI_TTS_VOICE,
            input=text[:4096],
            response_format="mp3",
        )
        audio_bytes = response.content
        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=response.mp3"},
        )
    except Exception as e:
        raise VoiceServiceError(message=f"Text-to-speech failed: {str(e)}")


@router.get(
    "/",
    summary="Get all conversations for the current user",
)
async def get_conversations(
    current_user: CurrentUser,
    limit: int = 20,
) -> dict:
    """Returns a list of the user's AI conversation sessions."""
    conversations = await ConversationDocument.find(
        ConversationDocument.user_id == str(current_user.id),
        ConversationDocument.is_archived == False,
    ).sort(-ConversationDocument.last_message_at).limit(limit).to_list()

    return {
        "success": True,
        "message": f"Found {len(conversations)} conversation(s)",
        "data": [
            {
                "id": str(c.id),
                "title": c.title,
                "last_message_at": c.last_message_at.isoformat(),
                "started_at": c.started_at.isoformat(),
            }
            for c in conversations
        ],
    }


@router.get(
    "/{conversation_id}/messages",
    summary="Get messages in a specific conversation",
)
async def get_messages(
    conversation_id: str,
    current_user: CurrentUser,
) -> dict:
    """Returns all messages in a conversation."""
    messages = await MessageDocument.find(
        MessageDocument.conversation_id == conversation_id,
        MessageDocument.user_id == str(current_user.id),
    ).sort(+MessageDocument.created_at).to_list()

    return {
        "success": True,
        "message": f"Found {len(messages)} message(s)",
        "data": [
            {
                "id": str(m.id),
                "role": m.role.value,
                "content": m.content,
                "citations": m.citations,
                "created_at": m.created_at.isoformat(),
            }
            for m in messages
        ],
    }
