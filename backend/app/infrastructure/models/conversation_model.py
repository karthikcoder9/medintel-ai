"""
MedIntel AI — AI Conversation and Message MongoDB Documents
Stores the full chat history for each user's AI interactions.
"""

from datetime import datetime, timezone
from typing import Optional, List, Any
from enum import Enum
from beanie import Document, Indexed
from pydantic import Field


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class CitationModel(dict):
    """Source citation attached to an AI response."""
    source: str
    url: Optional[str]
    excerpt: Optional[str]


class MessageDocument(Document):
    """A single message in an AI conversation."""

    conversation_id: Indexed(str)   # type: ignore
    user_id: str
    role: MessageRole
    content: str

    # AI metadata
    citations: List[dict] = []          # Source references
    tokens_used: Optional[int] = None
    model_version: Optional[str] = None
    retrieval_context: Optional[List[dict]] = None  # RAG chunks used
    is_flagged: bool = False            # Safety guardrail triggered
    flag_reason: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "messages"
        indexes = [
            [("conversation_id", 1), ("created_at", 1)],
            "user_id",
        ]


class ConversationDocument(Document):
    """A conversation session grouping related messages."""

    user_id: Indexed(str)           # type: ignore
    title: Optional[str] = None
    context_medicine_id: Optional[str] = None  # If conversation is about a specific medicine
    is_archived: bool = False

    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_message_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "conversations"
        indexes = [
            [("user_id", 1), ("last_message_at", -1)],
        ]
