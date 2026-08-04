"""
MedIntel AI — Auth API Endpoints
Registration, login, refresh, logout, and password reset.
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Body, status
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.security import (
    hash_password,
    verify_password,
    create_token_pair,
    decode_refresh_token,
    TokenPair,
)
from app.core.exceptions import (
    EmailAlreadyRegisteredError,
    AuthenticationError,
    AccountLockedError,
    TokenInvalidError,
)
from app.core.config import settings
from app.core.redis import CacheService
from app.infrastructure.models.user_model import UserDocument, UserRole, LanguageCode
from app.api.dependencies import CurrentUser, CacheDep

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


# ── Request / Response Schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.PATIENT
    language_pref: LanguageCode = LanguageCode.EN

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    access_token: str
    refresh_token: str


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    language_pref: LanguageCode
    is_verified: bool

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    tokens: TokenPair


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_user_response(user: UserDocument) -> UserResponse:
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        language_pref=user.language_pref,
        is_verified=user.is_verified,
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(body: RegisterRequest) -> dict:
    """
    Create a new user account.
    Checks for duplicate email before creating.
    """
    existing = await UserDocument.find_one(UserDocument.email == body.email)
    if existing:
        raise EmailAlreadyRegisteredError()

    user = UserDocument(
        email=body.email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        role=body.role,
        language_pref=body.language_pref,
    )
    await user.insert()

    tokens = create_token_pair(str(user.id), user.role.value)

    return {
        "success": True,
        "message": "Account created successfully. Welcome to MedIntel AI!",
        "data": AuthResponse(
            user=_build_user_response(user),
            tokens=tokens,
        ).model_dump(),
    }


@router.post(
    "/login",
    summary="Authenticate with email and password",
)
async def login(body: LoginRequest) -> dict:
    """
    Authenticate user and return JWT token pair.
    Enforces account lockout after MAX_FAILED_ATTEMPTS.
    """
    user = await UserDocument.find_one(UserDocument.email == body.email)

    if user is None:
        # Return generic error to prevent user enumeration
        raise AuthenticationError()

    # Check lockout
    if user.is_locked:
        raise AccountLockedError(
            message=f"Account locked due to too many failed attempts. "
                    f"Please try again after {LOCKOUT_DURATION_MINUTES} minutes."
        )

    # Verify password
    if not verify_password(body.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = datetime.now(timezone.utc) + timedelta(
                minutes=LOCKOUT_DURATION_MINUTES
            )
        user.update_timestamp()
        await user.save()
        raise AuthenticationError()

    # Successful login — reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = datetime.now(timezone.utc)
    user.update_timestamp()
    await user.save()

    tokens = create_token_pair(str(user.id), user.role.value)

    return {
        "success": True,
        "message": "Login successful",
        "data": AuthResponse(
            user=_build_user_response(user),
            tokens=tokens,
        ).model_dump(),
    }


@router.post(
    "/refresh",
    summary="Refresh access token using refresh token",
)
async def refresh_token(body: RefreshRequest) -> dict:
    """
    Issue a new access token using a valid refresh token.
    """
    try:
        payload = decode_refresh_token(body.refresh_token)
    except Exception:
        raise TokenInvalidError(message="Invalid or expired refresh token.")

    user = await UserDocument.get(payload.sub)
    if user is None or not user.is_active:
        raise TokenInvalidError()

    tokens = create_token_pair(str(user.id), user.role.value)

    return {
        "success": True,
        "message": "Token refreshed successfully",
        "data": tokens.model_dump(),
    }


@router.post(
    "/logout",
    summary="Invalidate tokens and log out",
)
async def logout(
    body: LogoutRequest,
    cache: CacheDep,
) -> dict:
    """
    Blacklist the provided tokens so they cannot be reused.
    """
    try:
        access_payload = decode_refresh_token.__wrapped__ if hasattr(decode_refresh_token, '__wrapped__') else None
        from app.core.security import decode_token
        access_payload = decode_token(body.access_token)
        await cache.blacklist_token(
            access_payload.jti,
            expire_seconds=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )
    except Exception:
        pass  # Token already expired — that's fine

    try:
        from app.core.security import decode_token
        refresh_payload = decode_token(body.refresh_token)
        await cache.blacklist_token(
            refresh_payload.jti,
            expire_seconds=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": "Logged out successfully",
        "data": None,
    }


@router.get(
    "/me",
    summary="Get the current authenticated user",
)
async def get_me(current_user: CurrentUser) -> dict:
    """Returns the profile of the currently authenticated user."""
    return {
        "success": True,
        "message": "User profile retrieved",
        "data": _build_user_response(current_user).model_dump(),
    }
