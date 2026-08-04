"""MedIntel AI — OCR Scan Document Model"""
from datetime import datetime, timezone
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class ScanDocument(Document):
    """Records every medicine image scan performed by a user."""

    user_id: Indexed(str)           # type: ignore
    image_url: Optional[str] = None             # Cloud Storage URL (not local)
    raw_extracted_text: Optional[str] = None    # Raw text from Gemini Vision
    processed_text: Optional[str] = None        # Cleaned/normalized text
    recognized_medicine_id: Optional[str] = None
    recognized_medicine_name: Optional[str] = None
    confidence_score: Optional[float] = None    # 0.0–1.0
    was_corrected_by_user: bool = False
    user_correction: Optional[str] = None
    scan_duration_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "scans"
        indexes = [[("user_id", 1), ("created_at", -1)]]
