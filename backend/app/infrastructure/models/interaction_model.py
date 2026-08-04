"""MedIntel AI — Patient Profile Document Model"""
from datetime import datetime, timezone
from typing import Optional, List
from beanie import Document, Indexed
from pydantic import Field


class PatientProfileDocument(Document):
    """Extended health profile for personalizing AI responses."""

    user_id: Indexed(str, unique=True)  # type: ignore
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_type: Optional[str] = None
    known_allergies: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_contact_relation: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "patient_profiles"
        indexes = ["user_id"]


class InteractionRecordDocument(Document):
    """Stores the result of a drug interaction check for a user."""

    user_id: Indexed(str)           # type: ignore
    medicines_checked: List[str]    # List of medicine IDs checked
    medicine_names: List[str]       # Denormalized names for display
    interactions_found: List[dict] = []  # Structured interaction results
    has_major_interaction: bool = False
    summary: Optional[str] = None   # AI-generated plain language summary
    checked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "interaction_records"
        indexes = [[("user_id", 1), ("checked_at", -1)]]
