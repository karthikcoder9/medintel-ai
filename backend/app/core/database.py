"""
MedIntel AI — MongoDB Database Connection
Uses Motor (async MongoDB driver) with Beanie ODM.
Provides a single shared client across the application lifecycle.
"""

import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from beanie import init_beanie

from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level MongoDB client — shared across all requests
_client: Optional[AsyncIOMotorClient] = None
_database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongodb() -> None:
    """
    Establish connection to MongoDB.
    Called once on application startup.
    Initializes Beanie ODM with all document models.
    """
    global _client, _database

    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}...")

    _client = AsyncIOMotorClient(
        settings.MONGODB_URL,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=10000,
        maxPoolSize=50,
        minPoolSize=10,
        maxIdleTimeMS=50000,
    )

    _database = _client[settings.MONGODB_DB_NAME]

    # Verify connection
    await _client.admin.command("ping")
    logger.info(f"✅ Connected to MongoDB database: '{settings.MONGODB_DB_NAME}'")

    # Import all document models for Beanie initialization
    # This must happen after the client is created
    from app.infrastructure.models.user_model import UserDocument
    from app.infrastructure.models.medicine_model import MedicineDocument
    from app.infrastructure.models.schedule_model import ScheduleDocument
    from app.infrastructure.models.history_model import MedicationHistoryDocument
    from app.infrastructure.models.conversation_model import (
        ConversationDocument,
        MessageDocument,
    )
    from app.infrastructure.models.scan_model import ScanDocument
    from app.infrastructure.models.interaction_model import (
        PatientProfileDocument,
        InteractionRecordDocument,
    )

    await init_beanie(
        database=_database,
        document_models=[
            UserDocument,
            MedicineDocument,
            ScheduleDocument,
            MedicationHistoryDocument,
            ConversationDocument,
            MessageDocument,
            ScanDocument,
            PatientProfileDocument,
            InteractionRecordDocument,
        ],
    )

    logger.info("✅ Beanie ODM initialized with all document models")

    # Auto-seed master dataset if collection is empty
    from app.infrastructure.seed_medicines import seed_medicines_if_empty
    await seed_medicines_if_empty()


async def disconnect_from_mongodb() -> None:
    """
    Close MongoDB connection.
    Called once on application shutdown.
    """
    global _client
    if _client:
        _client.close()
        logger.info("🔌 MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """
    Returns the active database instance.
    Raises RuntimeError if called before connection is established.
    """
    if _database is None:
        raise RuntimeError(
            "Database not initialized. "
            "Ensure connect_to_mongodb() was called during application startup."
        )
    return _database
