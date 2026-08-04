"""
MedIntel AI — Application Configuration
Uses Pydantic BaseSettings for type-safe, env-driven configuration.
All settings can be overridden via environment variables.
"""

from functools import lru_cache
from typing import Literal, List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Centralized application configuration.
    Reads from .env file and environment variables.
    Environment variables take precedence over .env values.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    APP_NAME: str = "MedIntel AI"
    APP_VERSION: str = "1.0.0"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    # ── Server ───────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── MongoDB ──────────────────────────────────────────────
    MONGODB_URL: str = Field(..., description="MongoDB connection string")
    MONGODB_DB_NAME: str = "medintel_db"

    # ── Redis ────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"
    REDIS_CACHE_TTL: int = 3600  # seconds

    # ── JWT ──────────────────────────────────────────────────
    JWT_SECRET_KEY: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Google Gemini ────────────────────────────────────────
    GEMINI_API_KEY: str = Field(..., description="Google Gemini API key")
    GEMINI_MODEL: str = "gemini-2.5-flash"
    GEMINI_VISION_MODEL: str = "gemini-2.5-flash"
    GEMINI_MAX_OUTPUT_TOKENS: int = 2048
    GEMINI_TEMPERATURE: float = 0.3

    # ── DeepSeek API ─────────────────────────────────────────
    DEEPSEEK_API_KEY: str = Field("your-deepseek-api-key-here", description="DeepSeek API key")
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"
    DEEPSEEK_MODEL: str = "deepseek-chat"

    # ── External APIs ────────────────────────────────────────
    OPENFDA_API_KEY: str = ""
    OPENFDA_BASE_URL: str = "https://api.fda.gov/drug"

    # ── Security ─────────────────────────────────────────────
    BCRYPT_ROUNDS: int = 12
    RATE_LIMIT_PER_MINUTE: int = 100
    MAX_IMAGE_UPLOAD_MB: int = 10

    # ── Logging ──────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "json"

    # ── Computed Properties ──────────────────────────────────
    @property
    def cors_origins(self) -> List[str]:
        """Parse comma-separated ALLOWED_ORIGINS into a list."""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def max_image_bytes(self) -> int:
        return self.MAX_IMAGE_UPLOAD_MB * 1024 * 1024

    @field_validator("GEMINI_TEMPERATURE")
    @classmethod
    def validate_temperature(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("GEMINI_TEMPERATURE must be between 0.0 and 1.0")
        return v


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached Settings instance.
    The @lru_cache ensures the .env file is read only once,
    preventing repeated disk I/O on every request.
    """
    return Settings()


# Module-level singleton for convenience imports
settings = get_settings()
