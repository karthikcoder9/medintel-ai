"""
MedIntel AI — Medication History, Conversation, Scan, Profile, and Interaction Models
"""

# ── medication_history_model.py ──────────────────────────────────────────────

from datetime import datetime, timezone
from typing import Optional, List, Any
from enum import Enum
from beanie import Document, Indexed
from pydantic import Field


class DoseStatus(str, Enum):
    TAKEN = "taken"
    SKIPPED = "skipped"
    MISSED = "missed"
    PENDING = "pending"


class MedicationHistoryDocument(Document):
    """Immutable dose event record — the audit trail of medication adherence."""

    user_id: Indexed(str)           # type: ignore
    schedule_id: str
    medicine_id: str
    medicine_name: str              # Denormalized

    scheduled_datetime: datetime
    taken_datetime: Optional[datetime] = None
    status: DoseStatus = DoseStatus.PENDING
    notes: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "medication_history"
        indexes = [
            [("user_id", 1), ("scheduled_datetime", -1)],
            [("user_id", 1), ("status", 1)],
            "schedule_id",
        ]
