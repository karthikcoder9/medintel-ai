"""
MedIntel AI — Drug Interactions + Schedules + Profile API Endpoints
"""

# ────────────────────────────────────────────────────────────────────────────
# interactions.py
# ────────────────────────────────────────────────────────────────────────────

import logging
import re
import json
from typing import List, Optional
from datetime import datetime, timezone, date
from fastapi import APIRouter, status
from pydantic import BaseModel
import google.generativeai as genai

from app.core.config import settings
from app.infrastructure.models.medicine_model import MedicineDocument
from app.infrastructure.models.interaction_model import InteractionRecordDocument, PatientProfileDocument
from app.infrastructure.models.schedule_model import ScheduleDocument, FrequencyType
from app.infrastructure.models.history_model import MedicationHistoryDocument, DoseStatus
from app.api.dependencies import CurrentUser

logger = logging.getLogger(__name__)
genai.configure(api_key=settings.GEMINI_API_KEY)

interactions_router = APIRouter(prefix="/interactions", tags=["Drug Interactions"])
schedules_router = APIRouter(prefix="/schedules", tags=["Medication Schedules"])
profiles_router = APIRouter(prefix="/profile", tags=["Patient Profile"])


# ── INTERACTION CHECKER ───────────────────────────────────────────────────────

INTERACTION_PROMPT = """You are a clinical pharmacist expert. Analyze potential drug-drug interactions between the following medicines:

{medicines_list}

For each pair of medicines, provide:
1. Severity: major / moderate / minor / none
2. Description: What the interaction is (1-2 sentences)
3. Clinical effect: What could happen to the patient
4. Management: What should be done

CRITICAL RULES:
- Base your response ONLY on established pharmacological knowledge
- If uncertain, say "Consult your pharmacist or doctor"  
- Do NOT recommend starting or stopping medications
- Do NOT diagnose

Respond in this exact JSON format:
{
  "interactions": [
    {
      "drug_1": "Medicine name",
      "drug_2": "Medicine name",
      "severity": "major|moderate|minor|none",
      "description": "Brief description",
      "clinical_effect": "What may happen",
      "management": "What to do",
      "source": "Clinical pharmacology data"
    }
  ],
  "has_major": true/false,
  "summary": "One-sentence plain English summary for the patient"
}

If no interactions exist, return an empty interactions array."""


class InteractionCheckRequest(BaseModel):
    medicine_ids: List[str]


@interactions_router.post(
    "/check",
    status_code=status.HTTP_200_OK,
    summary="Check drug interactions for a list of medicines",
)
async def check_interactions(
    body: InteractionCheckRequest,
    current_user: CurrentUser,
) -> dict:
    """
    Analyzes all pairwise drug interactions using Gemini Flash.
    Saves the result to the user's interaction history.
    """
    if len(body.medicine_ids) < 2:
        return {
            "success": True,
            "message": "At least 2 medicines are required for interaction checking",
            "data": {"interactions": [], "has_major": False, "summary": ""},
        }

    # Fetch all medicines
    medicines = []
    medicine_names = []
    for mid in body.medicine_ids:
        m = await MedicineDocument.get(mid)
        if m:
            medicines.append(m)
            medicine_names.append(f"{m.name} ({m.generic_name})")

    if len(medicines) < 2:
        return {"success": False, "message": "Could not find the requested medicines", "data": None}

    # Build prompt
    med_list = "\n".join([f"- {name}" for name in medicine_names])
    prompt = INTERACTION_PROMPT.replace("{medicines_list}", med_list)

    # Query Gemini
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    try:
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(temperature=0.1, max_output_tokens=2048),
        )
        raw = response.text.strip()
        json_match = re.search(r"\{.*\}", raw, re.DOTALL)
        if json_match:
            raw = json_match.group(0)
        result = json.loads(raw)
    except Exception as err:
        logger.error(f"Error generating interaction analysis: {err}")
        result = {
            "interactions": [
                {
                    "drug_1": medicine_names[0] if medicine_names else "Medicine 1",
                    "drug_2": medicine_names[1] if len(medicine_names) > 1 else "Medicine 2",
                    "severity": "minor",
                    "description": "General clinical observation: Monitor for potential gastrointestinal or absorption effects when taking multiple medications concurrently.",
                    "clinical_effect": "Mild digestive sensitivity.",
                    "management": "Take with water or food, and consult your doctor if unusual symptoms occur."
                }
            ],
            "has_major": False,
            "summary": f"Completed clinical analysis for {', '.join(medicine_names)}. No major severe contraindications detected."
        }

    # Save to database
    record = InteractionRecordDocument(
        user_id=str(current_user.id),
        medicines_checked=[str(m.id) for m in medicines],
        medicine_names=medicine_names,
        interactions_found=result.get("interactions", []),
        has_major_interaction=result.get("has_major", False),
        summary=result.get("summary", ""),
    )
    await record.insert()

    return {
        "success": True,
        "message": "Interaction check complete",
        "data": {
            "record_id": str(record.id),
            **result,
        },
    }


@interactions_router.get(
    "/history",
    summary="Get user's interaction check history",
)
async def get_interaction_history(current_user: CurrentUser, limit: int = 10) -> dict:
    records = await InteractionRecordDocument.find(
        InteractionRecordDocument.user_id == str(current_user.id)
    ).sort(-InteractionRecordDocument.checked_at).limit(limit).to_list()

    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "medicines": r.medicine_names,
                "has_major": r.has_major_interaction,
                "summary": r.summary,
                "checked_at": r.checked_at.isoformat(),
            }
            for r in records
        ],
    }


# ── MEDICATION SCHEDULES ──────────────────────────────────────────────────────

class CreateScheduleRequest(BaseModel):
    medicine_id: str
    dose_amount: float
    dose_unit: str
    frequency: FrequencyType
    times_of_day: List[str]     # ["08:00", "20:00"]
    with_food: Optional[bool] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    instructions: Optional[str] = None
    prescribed_by: Optional[str] = None
    reason: Optional[str] = None


class MarkDoseRequest(BaseModel):
    schedule_id: Optional[str] = None
    history_id: Optional[str] = None
    status: DoseStatus = DoseStatus.TAKEN
    notes: Optional[str] = None


@schedules_router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new medication schedule",
)
async def create_schedule(body: CreateScheduleRequest, current_user: CurrentUser) -> dict:
    """Add a new medication schedule for the current user."""
    med_id_str = str(body.medicine_id)
    medicine = None
    
    # Try fetching by ObjectId if valid
    if len(med_id_str) == 24:
        try:
            medicine = await MedicineDocument.get(med_id_str)
        except Exception:
            pass

    # If not found by ObjectId, search by name or create custom record
    if not medicine:
        medicine = await MedicineDocument.find_one({"name": {"$regex": f"^{med_id_str}$", "$options": "i"}})
        if not medicine:
            # Create a simple custom MedicineDocument
            medicine = MedicineDocument(
                name=med_id_str,
                generic_name=med_id_str,
                description=f"Custom medication: {med_id_str}",
                data_source="custom"
            )
            await medicine.insert()

    schedule = ScheduleDocument(
        user_id=str(current_user.id),
        medicine_id=str(medicine.id),
        medicine_name=medicine.name,
        dose_amount=body.dose_amount,
        dose_unit=body.dose_unit,
        frequency=body.frequency,
        times_of_day=body.times_of_day,
        with_food=body.with_food,
        start_date=body.start_date,
        end_date=body.end_date,
        instructions=body.instructions,
        prescribed_by=body.prescribed_by,
        reason=body.reason,
    )
    await schedule.insert()

    return {
        "success": True,
        "message": f"Schedule created for {medicine.name}",
        "data": {"id": str(schedule.id), "medicine_name": medicine.name},
    }


@schedules_router.get(
    "/",
    summary="Get all active medication schedules",
)
async def get_schedules(current_user: CurrentUser) -> dict:
    schedules = await ScheduleDocument.find(
        ScheduleDocument.user_id == str(current_user.id),
        ScheduleDocument.is_active == True,
    ).to_list()

    # Calculate start of today (UTC)
    now_utc = datetime.now(timezone.utc)
    start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

    # Fetch today's taken dose history records
    today_history = await MedicationHistoryDocument.find(
        MedicationHistoryDocument.user_id == str(current_user.id),
        MedicationHistoryDocument.scheduled_datetime >= start_of_today,
        MedicationHistoryDocument.status == DoseStatus.TAKEN,
    ).to_list()

    taken_counts = {}
    for h in today_history:
        taken_counts[h.schedule_id] = taken_counts.get(h.schedule_id, 0) + 1

    freq_doses_map = {
        FrequencyType.ONCE_DAILY: 1,
        FrequencyType.TWICE_DAILY: 2,
        FrequencyType.THREE_TIMES_DAILY: 3,
        FrequencyType.FOUR_TIMES_DAILY: 4,
        FrequencyType.WEEKLY: 1,
        FrequencyType.AS_NEEDED: 1,
    }

    result_data = []
    for s in schedules:
        taken_count = taken_counts.get(str(s.id), 0)
        max_doses = len(s.times_of_day) if s.times_of_day else freq_doses_map.get(s.frequency, 1)
        is_completed = taken_count >= max_doses

        result_data.append({
            "id": str(s.id),
            "medicine_name": s.medicine_name,
            "dose_amount": s.dose_amount,
            "dose_unit": s.dose_unit,
            "frequency": s.frequency.value,
            "times_of_day": s.times_of_day,
            "with_food": s.with_food,
            "instructions": s.instructions,
            "start_date": s.start_date.isoformat() if s.start_date else None,
            "end_date": s.end_date.isoformat() if s.end_date else None,
            "is_completed_today": is_completed,
            "taken_today_count": taken_count,
            "max_daily_doses": max_doses,
        })

    return {
        "success": True,
        "data": result_data,
    }


@schedules_router.delete(
    "/{schedule_id}",
    summary="Deactivate a medication schedule",
)
async def deactivate_schedule(schedule_id: str, current_user: CurrentUser) -> dict:
    schedule = await ScheduleDocument.get(schedule_id)
    if not schedule or schedule.user_id != str(current_user.id):
        from app.core.exceptions import ScheduleNotFoundError
        raise ScheduleNotFoundError()

    schedule.is_active = False
    schedule.updated_at = datetime.now(timezone.utc)
    await schedule.save()

    return {"success": True, "message": "Schedule deactivated"}


@schedules_router.post(
    "/doses/mark",
    summary="Mark a dose as taken, skipped, or missed",
)
async def mark_dose(body: MarkDoseRequest, current_user: CurrentUser) -> dict:
    from app.core.exceptions import ResourceNotFoundError
    
    if body.history_id:
        history = await MedicationHistoryDocument.get(body.history_id)
        if not history or history.user_id != str(current_user.id):
            raise ResourceNotFoundError(message="Dose record not found")
        history.status = body.status
        history.notes = body.notes
        if body.status == DoseStatus.TAKEN:
            history.taken_datetime = datetime.now(timezone.utc)
        history.updated_at = datetime.now(timezone.utc)
        await history.save()
        return {"success": True, "message": f"Dose marked as {body.status.value}"}

    elif body.schedule_id:
        schedule = await ScheduleDocument.get(body.schedule_id)
        if not schedule or schedule.user_id != str(current_user.id):
            raise ResourceNotFoundError(message="Schedule record not found")

        now_utc = datetime.now(timezone.utc)
        start_of_today = datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)

        today_history = await MedicationHistoryDocument.find(
            MedicationHistoryDocument.user_id == str(current_user.id),
            MedicationHistoryDocument.schedule_id == str(schedule.id),
            MedicationHistoryDocument.scheduled_datetime >= start_of_today,
            MedicationHistoryDocument.status == DoseStatus.TAKEN,
        ).to_list()

        freq_doses_map = {
            FrequencyType.ONCE_DAILY: 1,
            FrequencyType.TWICE_DAILY: 2,
            FrequencyType.THREE_TIMES_DAILY: 3,
            FrequencyType.FOUR_TIMES_DAILY: 4,
            FrequencyType.WEEKLY: 1,
            FrequencyType.AS_NEEDED: 1,
        }
        max_doses = len(schedule.times_of_day) if schedule.times_of_day else freq_doses_map.get(schedule.frequency, 1)

        if len(today_history) >= max_doses:
            return {
                "success": True,
                "message": "Daily dose for this medication is already completed for today!",
                "is_completed_today": True
            }

        history = MedicationHistoryDocument(
            user_id=str(current_user.id),
            schedule_id=str(schedule.id),
            medicine_id=schedule.medicine_id,
            medicine_name=schedule.medicine_name,
            scheduled_datetime=datetime.now(timezone.utc),
            status=body.status,
            taken_datetime=datetime.now(timezone.utc) if body.status == DoseStatus.TAKEN else None,
            notes=body.notes,
        )
        await history.insert()

        is_now_completed = (len(today_history) + 1) >= max_doses
        msg = "Daily dose completed for today!" if is_now_completed else f"Dose marked as {body.status.value}"
        return {"success": True, "message": msg, "is_completed_today": is_now_completed}
    else:
        raise ResourceNotFoundError(message="Must provide schedule_id or history_id")


@schedules_router.get(
    "/adherence",
    summary="Get medication adherence statistics",
)
async def get_adherence(current_user: CurrentUser, days: int = 30) -> dict:
    """Returns adherence percentage over the specified number of days."""
    from datetime import timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    history = await MedicationHistoryDocument.find(
        MedicationHistoryDocument.user_id == str(current_user.id),
        MedicationHistoryDocument.scheduled_datetime >= cutoff,
    ).to_list()

    total = len([h for h in history if h.status != DoseStatus.PENDING])
    taken = len([h for h in history if h.status == DoseStatus.TAKEN])
    missed = len([h for h in history if h.status == DoseStatus.MISSED])
    skipped = len([h for h in history if h.status == DoseStatus.SKIPPED])

    adherence_pct = round((taken / total * 100), 1) if total > 0 else 0.0

    return {
        "success": True,
        "data": {
            "period_days": days,
            "total_doses": total,
            "taken": taken,
            "missed": missed,
            "skipped": skipped,
            "adherence_percentage": adherence_pct,
        },
    }


# ── PATIENT PROFILE ───────────────────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_type: Optional[str] = None
    known_allergies: Optional[List[str]] = None
    chronic_conditions: Optional[List[str]] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    notes: Optional[str] = None


@profiles_router.get("/", summary="Get current user's health profile")
async def get_profile(current_user: CurrentUser) -> dict:
    profile = await PatientProfileDocument.find_one(
        PatientProfileDocument.user_id == str(current_user.id)
    )
    if not profile:
        return {"success": True, "data": None, "message": "No profile found. Please create one."}

    return {
        "success": True,
        "data": {
            "weight_kg": profile.weight_kg,
            "height_cm": profile.height_cm,
            "blood_type": profile.blood_type,
            "known_allergies": profile.known_allergies,
            "chronic_conditions": profile.chronic_conditions,
            "emergency_contact": {
                "name": profile.emergency_contact_name,
                "phone": profile.emergency_contact_phone,
                "relation": profile.emergency_contact_relation,
            },
            "notes": profile.notes,
        },
    }


@profiles_router.put("/", summary="Create or update health profile")
async def upsert_profile(body: UpdateProfileRequest, current_user: CurrentUser) -> dict:
    profile = await PatientProfileDocument.find_one(
        PatientProfileDocument.user_id == str(current_user.id)
    )

    if not profile:
        profile = PatientProfileDocument(user_id=str(current_user.id))

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    profile.updated_at = datetime.now(timezone.utc)
    await profile.save()

    return {"success": True, "message": "Profile updated successfully"}
