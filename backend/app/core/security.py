"""
MedIntel AI — Security Utilities
JWT token creation/verification, password hashing, and token models.
All cryptographic operations are centralized here.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings

import bcrypt

# ── Password Hashing ────────────────────────────────────────────────────────

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    pw_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt(rounds=settings.BCRYPT_ROUNDS)
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pw_bytes, hash_bytes)
    except Exception:
        return False


# ── Token Models ─────────────────────────────────────────────────────────────

class TokenPayload(BaseModel):
    """Claims embedded in a JWT token."""
    sub: str          # Subject — user ID
    jti: str          # JWT ID — unique token identifier
    type: str         # "access" or "refresh"
    role: str         # User role
    exp: datetime     # Expiry timestamp
    iat: datetime     # Issued-at timestamp


class TokenPair(BaseModel):
    """Access + Refresh token pair returned on login/refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int   # Access token TTL in seconds


# ── JWT Token Factory ────────────────────────────────────────────────────────

def create_access_token(user_id: str, role: str) -> str:
    """
    Create a short-lived JWT access token.
    Expires in JWT_ACCESS_TOKEN_EXPIRE_MINUTES minutes.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": user_id,
        "jti": str(uuid4()),
        "type": "access",
        "role": role,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(user_id: str, role: str) -> str:
    """
    Create a long-lived JWT refresh token.
    Expires in JWT_REFRESH_TOKEN_EXPIRE_DAYS days.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)

    payload: dict[str, Any] = {
        "sub": user_id,
        "jti": str(uuid4()),
        "type": "refresh",
        "role": role,
        "iat": now,
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_token_pair(user_id: str, role: str) -> TokenPair:
    """Create an access + refresh token pair for a user."""
    return TokenPair(
        access_token=create_access_token(user_id, role),
        refresh_token=create_refresh_token(user_id, role),
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


def decode_token(token: str) -> TokenPayload:
    """
    Decode and validate a JWT token.
    Raises JWTError if invalid or expired.
    """
    payload = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
    )
    return TokenPayload(**payload)


def decode_access_token(token: str) -> TokenPayload:
    """
    Decode and validate an access token specifically.
    Raises ValueError if token type is not 'access'.
    """
    payload = decode_token(token)
    if payload.type != "access":
        raise JWTError("Expected access token, got refresh token")
    return payload


def decode_refresh_token(token: str) -> TokenPayload:
    """
    Decode and validate a refresh token specifically.
    Raises ValueError if token type is not 'refresh'.
    """
    payload = decode_token(token)
    if payload.type != "refresh":
        raise JWTError("Expected refresh token, got access token")
    return payload
