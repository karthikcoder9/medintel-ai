"""
MedIntel AI — Medicine API Endpoints
Search, retrieve, add to profile, and manage user medicines.
"""

from typing import Optional, List
from fastapi import APIRouter, Query, Path, status
from pydantic import BaseModel

from app.infrastructure.models.medicine_model import MedicineDocument
from app.infrastructure.models.user_model import UserDocument
from app.core.exceptions import MedicineNotFoundError, MedicineAlreadyInProfileError
from app.core.redis import CacheKeys
from app.api.dependencies import CurrentUser, CacheDep

router = APIRouter(prefix="/medicines", tags=["Medicines"])


# ── Response Schemas ──────────────────────────────────────────────────────────

class MedicineResponse(BaseModel):
    id: str
    name: str
    generic_name: str
    drug_class: Optional[str]
    dosage_forms: List[str]
    strengths: List[str]
    description: str
    mechanism_of_action: Optional[str]
    indications: Optional[str]
    contraindications: Optional[str]
    side_effects: dict
    precautions: Optional[str]
    elderly_warnings: Optional[str]
    food_interactions: List[str]
    storage_instructions: Optional[str]
    is_otc: bool
    simple_explanation: Optional[str]
    data_source: str


class UserMedicineItem(BaseModel):
    medicine_id: str
    prescribed_by: Optional[str] = None
    reason: Optional[str] = None


def _medicine_to_response(m: MedicineDocument) -> dict:
    return MedicineResponse(
        id=str(m.id),
        name=m.name,
        generic_name=m.generic_name,
        drug_class=m.drug_class,
        dosage_forms=m.dosage_forms,
        strengths=m.strengths,
        description=m.description,
        mechanism_of_action=m.mechanism_of_action,
        indications=m.indications,
        contraindications=m.contraindications,
        side_effects=m.side_effects,
        precautions=m.precautions,
        elderly_warnings=m.elderly_warnings,
        food_interactions=m.food_interactions,
        storage_instructions=m.storage_instructions,
        is_otc=m.is_otc,
        simple_explanation=m.simple_explanation,
        data_source=m.data_source,
    ).model_dump()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get(
    "/search",
    summary="Search medicines by name or generic name",
)
async def search_medicines(
    current_user: CurrentUser,
    cache: CacheDep,
    q: Optional[str] = Query(default="", description="Drug name to search"),
    limit: int = Query(default=20, ge=1, le=50),
) -> dict:
    """
    Full-text & regex search over the medicine catalogue.
    If query term 'q' is empty, returns the default catalogue list.
    """
    q_clean = (q or "").strip()
    cache_key = CacheKeys.medicine_search(q_clean)
    cached = await cache.get(cache_key)
    if cached:
        return {"success": True, "message": "Search results (cached)", "data": cached}

    if not q_clean:
        medicines = await MedicineDocument.find_all().limit(limit).to_list()
    else:
        medicines = await MedicineDocument.find(
            {
                "$or": [
                    {"name": {"$regex": q_clean, "$options": "i"}},
                    {"generic_name": {"$regex": q_clean, "$options": "i"}},
                    {"drug_class": {"$regex": q_clean, "$options": "i"}},
                    {"search_keywords": {"$regex": q_clean, "$options": "i"}},
                ]
            }
        ).limit(limit).to_list()

    results = [_medicine_to_response(m) for m in medicines]
    await cache.set(cache_key, results)

    return {
        "success": True,
        "message": f"Found {len(results)} result(s)",
        "data": results,
    }


@router.get(
    "/{medicine_id}",
    summary="Get detailed medicine information by ID",
)
async def get_medicine_detail(
    medicine_id: str,
    current_user: CurrentUser,
    cache: CacheDep,
) -> dict:
    """
    Retrieve complete medicine information including side effects,
    interactions, elderly warnings, and plain-language explanation.
    """
    cache_key = CacheKeys.medicine(medicine_id)
    cached = await cache.get(cache_key)
    if cached:
        return {"success": True, "message": "Medicine details (cached)", "data": cached}

    medicine = await MedicineDocument.get(medicine_id)
    if not medicine:
        raise MedicineNotFoundError()

    result = _medicine_to_response(medicine)
    await cache.set(cache_key, result, ttl=86400)  # Cache for 24h

    return {
        "success": True,
        "message": "Medicine details retrieved",
        "data": result,
    }


@router.get(
    "/my/list",
    summary="Get all medicines in current user's profile",
)
async def get_my_medicines(
    current_user: CurrentUser,
    cache: CacheDep,
) -> dict:
    """
    Returns the user's active medication list with full details.
    Used by the dashboard and interaction checker.
    """
    cache_key = CacheKeys.user_medicines(str(current_user.id))
    cached = await cache.get(cache_key)
    if cached:
        return {"success": True, "message": "Your medicines (cached)", "data": cached}

    # Fetch user profile to get medicine IDs
    from app.infrastructure.models.interaction_model import PatientProfileDocument
    # For simplicity, we use a separate UserMedicines collection approach
    # Retrieve from schedule documents
    from app.infrastructure.models.schedule_model import ScheduleDocument
    schedules = await ScheduleDocument.find(
        ScheduleDocument.user_id == str(current_user.id),
        ScheduleDocument.is_active == True,
    ).to_list()

    medicine_ids = list({s.medicine_id for s in schedules})
    medicines = []
    for mid in medicine_ids:
        m = await MedicineDocument.get(mid)
        if m:
            medicines.append(_medicine_to_response(m))

    await cache.set(cache_key, medicines, ttl=3600)

    return {
        "success": True,
        "message": f"Found {len(medicines)} active medicine(s)",
        "data": medicines,
    }
