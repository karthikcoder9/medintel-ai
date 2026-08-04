"""
MedIntel AI — API v1 Router
Aggregates all endpoint routers into the v1 prefix group.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.medicines import router as medicines_router
from app.api.v1.endpoints.scans import router as scans_router
from app.api.v1.endpoints.conversations import router as conversations_router
from app.api.v1.endpoints.interactions_schedules_profiles import (
    interactions_router,
    schedules_router,
    profiles_router,
)

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(medicines_router)
api_router.include_router(scans_router)
api_router.include_router(conversations_router)
api_router.include_router(interactions_router)
api_router.include_router(schedules_router)
api_router.include_router(profiles_router)
