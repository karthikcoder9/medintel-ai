"""
MedIntel AI — Redis Cache Connection
Async Redis client for caching drug data, rate limiting, and session tokens.
"""

import logging
from typing import Optional, Any
import json

import redis.asyncio as redis
from redis.asyncio import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[Redis] = None


async def connect_to_redis() -> None:
    """Initialize Redis connection pool on app startup."""
    global _redis_client
    try:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
        await _redis_client.ping()
        logger.info("✅ Redis connection established")
    except Exception as e:
        logger.warning(f"⚠️ Redis unavailable ({e}). Running app with MongoDB only (caching disabled).")
        _redis_client = None


async def disconnect_from_redis() -> None:
    """Close Redis connection on app shutdown."""
    global _redis_client
    if _redis_client:
        try:
            await _redis_client.aclose()
            logger.info("🔌 Redis connection closed")
        except Exception:
            pass


def get_redis() -> Optional[Redis]:
    """Return the active Redis client (or None if unavailable)."""
    return _redis_client


# ── Cache Helpers ─────────────────────────────────────────────────────────────

class CacheService:
    """
    High-level cache service wrapping Redis operations.
    All values are JSON-serialized for type safety.
    Gracefully handles cases where Redis is not connected.
    """

    def __init__(self, redis_client: Optional[Redis] = None):
        self._client = redis_client
        self._default_ttl = settings.REDIS_CACHE_TTL

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve a cached value. Returns None on cache miss or if Redis is offline."""
        if not self._client:
            return None
        try:
            raw = await self._client.get(key)
            if raw is None:
                return None
            return json.loads(raw)
        except Exception:
            return None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Cache a value with optional TTL override."""
        if not self._client:
            return
        try:
            await self._client.setex(
                name=key,
                time=ttl or self._default_ttl,
                value=json.dumps(value, default=str),
            )
        except Exception:
            pass

    async def delete(self, key: str) -> None:
        """Remove a cached key."""
        if not self._client:
            return
        try:
            await self._client.delete(key)
        except Exception:
            pass

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        if not self._client:
            return False
        try:
            return bool(await self._client.exists(key))
        except Exception:
            return False

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a pattern (e.g. 'medicine:*')."""
        if not self._client:
            return 0
        try:
            keys = await self._client.keys(pattern)
            if keys:
                return await self._client.delete(*keys)
        except Exception:
            pass
        return 0

    # ── Blacklisted Tokens ───────────────────────────────────────────────────

    async def blacklist_token(self, jti: str, expire_seconds: int) -> None:
        """Add a token JTI to the blacklist (for logout/revocation)."""
        if not self._client:
            return
        try:
            await self._client.setex(
                name=f"blacklist:token:{jti}",
                time=expire_seconds,
                value="1",
            )
        except Exception:
            pass

    async def is_token_blacklisted(self, jti: str) -> bool:
        """Check if a token has been revoked."""
        return await self.exists(f"blacklist:token:{jti}")

    # ── Rate Limiting ────────────────────────────────────────────────────────

    async def check_rate_limit(
        self,
        identifier: str,
        limit: int = 100,
        window_seconds: int = 60,
    ) -> tuple[bool, int]:
        """
        Sliding window rate limiter.
        Returns (is_allowed, remaining_requests).
        """
        if not self._client:
            return True, limit
        try:
            key = f"rate_limit:{identifier}"
            pipe = self._client.pipeline()
            pipe.incr(key)
            pipe.expire(key, window_seconds)
            results = await pipe.execute()
            current_count = results[0]

            remaining = max(0, limit - current_count)
            return current_count <= limit, remaining
        except Exception:
            return True, limit


# ── Cache Key Builders ────────────────────────────────────────────────────────

class CacheKeys:
    """Centralized cache key namespace to prevent collisions."""

    @staticmethod
    def medicine(medicine_id: str) -> str:
        return f"medicine:{medicine_id}"

    @staticmethod
    def medicine_search(query: str) -> str:
        return f"medicine:search:{query.lower().strip()}"

    @staticmethod
    def user_medicines(user_id: str) -> str:
        return f"user:{user_id}:medicines"

    @staticmethod
    def drug_interaction(drug1_id: str, drug2_id: str) -> str:
        # Sort IDs to ensure consistent cache key regardless of order
        ids = sorted([drug1_id, drug2_id])
        return f"interaction:{ids[0]}:{ids[1]}"

    @staticmethod
    def user_profile(user_id: str) -> str:
        return f"user:{user_id}:profile"

    @staticmethod
    def today_schedule(user_id: str) -> str:
        return f"user:{user_id}:schedule:today"
