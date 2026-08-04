"""
MedIntel AI — User MongoDB Document Model
Beanie ODM document definition for the 'users' collection.
"""

from datetime import datetime, timezone
from typing import Optional
from enum import Enum

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class UserRole(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    MEDICAL_STUDENT = "medical_student"
    HEALTHCARE_WORKER = "healthcare_worker"
    ADMIN = "admin"


class LanguageCode(str, Enum):
    EN = "en"
    HI = "hi"
    BN = "bn"
    TE = "te"
    MR = "mr"
    TA = "ta"
    GU = "gu"
    KN = "kn"
    ML = "ml"
    PA = "pa"
    UR = "ur"


class UserDocument(Document):
    """
    MongoDB document representing an authenticated user.
    Indexed fields are marked for query performance.
    """

    email: Indexed(EmailStr, unique=True)  # type: ignore
    password_hash: str
    full_name: str
    phone_number: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    role: UserRole = UserRole.PATIENT
    language_pref: LanguageCode = LanguageCode.EN

    # Account state
    is_active: bool = True
    is_verified: bool = False
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

    # FCM token for push notifications
    fcm_token: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "created_at",
        ]

    def update_timestamp(self) -> None:
        """Call before saving to update the updated_at field."""
        self.updated_at = datetime.now(timezone.utc)

    @property
    def is_locked(self) -> bool:
        """Check if the account is currently locked."""
        if self.locked_until is None:
            return False
        return datetime.now(timezone.utc) < self.locked_until

    def __repr__(self) -> str:
        return f"<User email={self.email} role={self.role}>"
