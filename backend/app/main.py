"""
MedIntel AI — FastAPI Application Entry Point
Production-grade application setup with lifespan, middleware, and exception handlers.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.database import connect_to_mongodb, disconnect_from_mongodb
from app.core.redis import connect_to_redis, disconnect_from_redis
from app.core.exceptions import MedIntelBaseException
from app.api.v1.router import api_router

# ── Structured Logging Setup ─────────────────────────────────────────────────

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer()
        if settings.LOG_FORMAT == "console"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)

logger = structlog.get_logger(__name__)

# ── Rate Limiter ──────────────────────────────────────────────────────────────

limiter = Limiter(key_func=get_remote_address)

# ── Application Lifespan ──────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator:
    """
    Manages application startup and shutdown lifecycle.
    Establishes database and cache connections on startup,
    gracefully closes them on shutdown.
    """
    logger.info(
        "🚀 Starting MedIntel AI",
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
    )

    # Startup
    await connect_to_mongodb()
    await connect_to_redis()

    logger.info("✅ All services initialized. Application ready.")
    yield

    # Shutdown
    logger.info("🛑 Shutting down MedIntel AI...")
    await disconnect_from_mongodb()
    await disconnect_from_redis()
    logger.info("✅ Graceful shutdown complete.")


# ── FastAPI Application Factory ───────────────────────────────────────────────

def create_application() -> FastAPI:
    """
    Factory function to create the FastAPI application.
    Applies middleware, routers, and exception handlers.
    """
    app = FastAPI(
        title="MedIntel AI API",
        description=(
            "Explainable Multimodal AI Medication Understanding and Safety Assistant. "
            "⚠️ This system does NOT provide medical diagnoses or prescriptions. "
            "Always consult a qualified healthcare professional."
        ),
        version=settings.APP_VERSION,
        docs_url="/api/docs" if not settings.is_production else None,
        redoc_url="/api/redoc" if not settings.is_production else None,
        openapi_url="/api/openapi.json" if not settings.is_production else None,
        lifespan=lifespan,
    )

    # ── Rate Limiting ─────────────────────────────────────────
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # ── CORS Middleware ───────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Rate-Limit-Remaining"],
    )

    # ── Request Logging Middleware ────────────────────────────
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        import uuid
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "Request completed",
            status_code=response.status_code,
        )
        return response

    # ── Exception Handlers ────────────────────────────────────
    @app.exception_handler(MedIntelBaseException)
    async def medintel_exception_handler(
        request: Request, exc: MedIntelBaseException
    ) -> JSONResponse:
        """Handle all application-specific exceptions with consistent format."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "data": None,
                "message": exc.message,
                "error_code": exc.error_code,
                "details": exc.details,
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors with field-level details."""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"][1:]),
                "message": error["msg"],
                "type": error["type"],
            })
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "success": False,
                "data": None,
                "message": "Input validation failed",
                "error_code": "VALIDATION_ERROR",
                "details": errors,
            },
        )

    @app.exception_handler(Exception)
    async def generic_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catch-all handler — prevents raw 500 errors from leaking internals."""
        logger.error("Unhandled exception", exc_info=exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "data": None,
                "message": "An unexpected error occurred. Please try again.",
                "error_code": "INTERNAL_SERVER_ERROR",
                "details": None,
            },
        )

    # ── Routers ───────────────────────────────────────────────
    app.include_router(api_router, prefix="/api/v1")

    # ── Health Check ──────────────────────────────────────────
    @app.get("/health", tags=["System"])
    async def health_check():
        return {
            "status": "healthy",
            "service": "MedIntel AI",
            "version": settings.APP_VERSION,
            "environment": settings.APP_ENV,
        }

    return app


app = create_application()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
