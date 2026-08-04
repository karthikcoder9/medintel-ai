"""
MedIntel AI — Medication Schedule MongoDB Document Model
"""

from datetime import datetime, time, timezone
from typing import Optional, List
from enum import Enum
from beanie import Document, Indexed
from pydantic import Field
from bson import ObjectId


class FrequencyType(str, Enum):
    ONCE_DAILY = "once_daily"
    TWICE_DAILY = "twice_daily"
    THREE_TIMES_DAILY = "three_times_daily"
    FOUR_TIMES_DAILY = "four_times_daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    AS_NEEDED = "as_needed"
    CUSTOM = "custom"


class ScheduleDocument(Document):
    """
    Represents a single medication dosing schedule for a user.
    One user-medicine pair can have one active schedule.
    """

    user_id: Indexed(str)           # type: ignore  # ref to UserDocument
    medicine_id: str                # ref to MedicineDocument
    medicine_name: str              # Denormalized for quick display

    # ── Dosing ────────────────────────────────────────────────
    dose_amount: float
    dose_unit: str                  # mg, ml, tablet, capsule, drop
    frequency: FrequencyType
    times_of_day: List[str]         # ["08:00", "20:00"] — HH:MM format
    with_food: Optional[bool] = None
    instructions: Optional[str] = None

    # ── Duration ──────────────────────────────────────────────
    start_date: datetime
    end_date: Optional[datetime] = None   # None = ongoing

    # ── Metadata ──────────────────────────────────────────────
    prescribed_by: Optional[str] = None
    reason: Optional[str] = None
    is_active: bool = True

    # ── Timestamps ────────────────────────────────────────────
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "schedules"
        indexes = [
            "user_id",
            [("user_id", 1), ("is_active", 1)],
            "medicine_id",
        ]
