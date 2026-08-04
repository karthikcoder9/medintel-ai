"""
MedIntel AI — Medicine MongoDB Document Model
Master medicine catalogue. Seeded from OpenFDA and enriched by AI.
"""

from datetime import datetime, timezone
from typing import Optional, List
from pydantic import Field
from beanie import Document, Indexed


class SideEffects(dict):
    """Structured side effects by severity."""
    common: List[str] = []
    rare: List[str] = []
    serious: List[str] = []


class MedicineDocument(Document):
    """
    MongoDB document for a medicine in the master catalogue.
    Used as the primary reference for all AI explanations and interactions.
    """

    # ── Identification ────────────────────────────────────────
    name: Indexed(str)              # type: ignore  # Brand name
    generic_name: Indexed(str)      # type: ignore  # INN generic name
    rxcui: Optional[str] = None     # RxNorm concept ID
    ndc_codes: List[str] = []       # NDC product codes
    atc_code: Optional[str] = None  # ATC classification

    # ── Classification ────────────────────────────────────────
    drug_class: Optional[str] = None
    dosage_forms: List[str] = []    # tablet, capsule, syrup, injection
    strengths: List[str] = []       # 10mg, 20mg, 500mg

    # ── Manufacturer ─────────────────────────────────────────
    manufacturer: Optional[str] = None

    # ── Clinical Information ──────────────────────────────────
    description: str                # Plain language summary
    mechanism_of_action: Optional[str] = None
    indications: Optional[str] = None          # What it treats
    contraindications: Optional[str] = None    # When NOT to use
    side_effects: dict = Field(
        default_factory=lambda: {"common": [], "rare": [], "serious": []}
    )
    precautions: Optional[str] = None
    elderly_warnings: Optional[str] = None     # Specific elderly cautions
    pregnancy_category: Optional[str] = None
    food_interactions: List[str] = []
    storage_instructions: Optional[str] = None

    # ── Flags ─────────────────────────────────────────────────
    is_otc: bool = False            # Over-the-counter availability
    is_controlled: bool = False     # Controlled substance

    # ── AI-Generated Simplified Explanation ──────────────────
    simple_explanation: Optional[str] = None   # Pre-generated elderly-friendly text
    simple_explanation_generated_at: Optional[datetime] = None

    # ── Data Source ───────────────────────────────────────────
    data_source: str = "openfda"
    source_url: Optional[str] = None
    last_synced_at: Optional[datetime] = None

    # ── Search support ────────────────────────────────────────
    search_keywords: List[str] = []  # Additional search terms

    # ── Timestamps ────────────────────────────────────────────
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "medicines"
        indexes = [
            "name",
            "generic_name",
            "rxcui",
            "drug_class",
            "is_otc",
        ]

    def __repr__(self) -> str:
        return f"<Medicine name={self.name} generic={self.generic_name}>"
