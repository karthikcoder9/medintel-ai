"""
MedIntel AI — FastAPI Dependency Injection
All injectable dependencies (current user, services, cache) are defined here.
"""

from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError

from app.core.security import decode_access_token
from app.core.exceptions import TokenExpiredError, TokenInvalidError, InsufficientPermissionsError
from app.core.redis import get_redis, CacheService
from app.infrastructure.models.user_model import UserDocument, UserRole

# ── HTTP Bearer Token Scheme ──────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)


# ── Current User Dependency ───────────────────────────────────────────────────

async def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme)
    ] = None,
) -> UserDocument:
    """
    Extract and validate the JWT bearer token from the Authorization header.
    Returns the authenticated UserDocument or raises 401.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except JWTError as e:
        if "expired" in str(e).lower():
            raise TokenExpiredError()
        raise TokenInvalidError()

    # Check token blacklist (logout revocation)
    cache = CacheService(get_redis())
    if await cache.is_token_blacklisted(payload.jti):
        raise TokenInvalidError(message="Token has been revoked. Please log in again.")

    # Fetch user from database
    user = await UserDocument.get(payload.sub)
    if user is None:
        raise TokenInvalidError(message="User account not found.")

    if not user.is_active:
        raise TokenInvalidError(message="Your account has been deactivated.")

    if user.is_locked:
        raise TokenInvalidError(message="Your account is temporarily locked.")

    return user


# ── Role-Based Access Control ─────────────────────────────────────────────────

def require_role(*roles: UserRole):
    """
    Factory: Returns a dependency that enforces one of the given roles.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role(UserRole.ADMIN))])
    """
    async def role_checker(
        current_user: Annotated[UserDocument, Depends(get_current_user)]
    ) -> UserDocument:
        if current_user.role not in roles:
            raise InsufficientPermissionsError(
                message=f"This action requires one of these roles: {[r.value for r in roles]}"
            )
        return current_user
    return role_checker


# ── Service Dependencies ──────────────────────────────────────────────────────

async def get_cache_service() -> CacheService:
    """Inject CacheService backed by the Redis connection."""
    return CacheService(get_redis())


# ── Type Aliases (for cleaner endpoint signatures) ───────────────────────────

CurrentUser = Annotated[UserDocument, Depends(get_current_user)]
CacheDep = Annotated[CacheService, Depends(get_cache_service)]
AdminUser = Annotated[UserDocument, Depends(require_role(UserRole.ADMIN))]
