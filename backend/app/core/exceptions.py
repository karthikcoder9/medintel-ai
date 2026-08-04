"""
MedIntel AI — Custom Exception Hierarchy
All application-specific exceptions extend from MedIntelBaseException.
FastAPI exception handlers are registered in main.py.
"""

from typing import Any, Optional


class MedIntelBaseException(Exception):
    """
    Base exception for all MedIntel AI application errors.
    Carries an HTTP status code, error code, and user-facing message.
    """

    status_code: int = 500
    error_code: str = "INTERNAL_ERROR"
    message: str = "An unexpected error occurred"

    def __init__(
        self,
        message: Optional[str] = None,
        details: Optional[Any] = None,
    ) -> None:
        self.message = message or self.__class__.message
        self.details = details
        super().__init__(self.message)


# ── Authentication Exceptions ────────────────────────────────────────────────

class AuthenticationError(MedIntelBaseException):
    status_code = 401
    error_code = "AUTHENTICATION_FAILED"
    message = "Authentication failed. Please check your credentials."


class TokenExpiredError(MedIntelBaseException):
    status_code = 401
    error_code = "TOKEN_EXPIRED"
    message = "Your session has expired. Please log in again."


class TokenInvalidError(MedIntelBaseException):
    status_code = 401
    error_code = "TOKEN_INVALID"
    message = "Invalid authentication token."


class AccountLockedError(MedIntelBaseException):
    status_code = 423
    error_code = "ACCOUNT_LOCKED"
    message = "Account temporarily locked due to too many failed attempts."


class InsufficientPermissionsError(MedIntelBaseException):
    status_code = 403
    error_code = "INSUFFICIENT_PERMISSIONS"
    message = "You do not have permission to perform this action."


# ── Resource Exceptions ──────────────────────────────────────────────────────

class ResourceNotFoundError(MedIntelBaseException):
    status_code = 404
    error_code = "RESOURCE_NOT_FOUND"
    message = "The requested resource was not found."


class UserNotFoundError(ResourceNotFoundError):
    error_code = "USER_NOT_FOUND"
    message = "User not found."


class MedicineNotFoundError(ResourceNotFoundError):
    error_code = "MEDICINE_NOT_FOUND"
    message = "Medicine not found in our database."


class ScheduleNotFoundError(ResourceNotFoundError):
    error_code = "SCHEDULE_NOT_FOUND"
    message = "Medication schedule not found."


class ConversationNotFoundError(ResourceNotFoundError):
    error_code = "CONVERSATION_NOT_FOUND"
    message = "Conversation not found."


# ── Conflict Exceptions ──────────────────────────────────────────────────────

class ResourceAlreadyExistsError(MedIntelBaseException):
    status_code = 409
    error_code = "RESOURCE_ALREADY_EXISTS"
    message = "A resource with this identifier already exists."


class EmailAlreadyRegisteredError(ResourceAlreadyExistsError):
    error_code = "EMAIL_ALREADY_REGISTERED"
    message = "This email address is already registered."


class MedicineAlreadyInProfileError(ResourceAlreadyExistsError):
    error_code = "MEDICINE_ALREADY_IN_PROFILE"
    message = "This medicine is already in your medication list."


# ── Validation Exceptions ────────────────────────────────────────────────────

class ValidationError(MedIntelBaseException):
    status_code = 422
    error_code = "VALIDATION_ERROR"
    message = "Input validation failed."


class InvalidImageError(ValidationError):
    error_code = "INVALID_IMAGE"
    message = "Invalid image format or corrupted file."


class ImageTooLargeError(ValidationError):
    error_code = "IMAGE_TOO_LARGE"
    message = "Image file exceeds the maximum allowed size."


class InvalidPasswordError(ValidationError):
    error_code = "INVALID_PASSWORD"
    message = "Password does not meet security requirements."


# ── AI / External Service Exceptions ─────────────────────────────────────────

class AIServiceError(MedIntelBaseException):
    status_code = 503
    error_code = "AI_SERVICE_ERROR"
    message = "The AI service is temporarily unavailable. Please try again."


class OCRFailedError(AIServiceError):
    error_code = "OCR_FAILED"
    message = "Could not extract text from the image. Please try with a clearer image."


class LLMResponseError(AIServiceError):
    error_code = "LLM_RESPONSE_ERROR"
    message = "AI failed to generate a response. Please try again."


class VoiceServiceError(AIServiceError):
    error_code = "VOICE_SERVICE_ERROR"
    message = "Voice processing service is unavailable."


class ExternalAPIError(MedIntelBaseException):
    status_code = 502
    error_code = "EXTERNAL_API_ERROR"
    message = "An external service returned an error."


# ── Safety Exceptions ────────────────────────────────────────────────────────

class SafetyGuardrailTriggered(MedIntelBaseException):
    """
    Raised when the AI response is blocked by safety guardrails.
    The AI attempted to diagnose or prescribe — which is prohibited.
    """
    status_code = 400
    error_code = "SAFETY_GUARDRAIL_TRIGGERED"
    message = (
        "I'm sorry, but I cannot provide medical diagnoses or prescriptions. "
        "Please consult a qualified healthcare professional for medical advice."
    )


# ── Rate Limiting ─────────────────────────────────────────────────────────────

class RateLimitExceededError(MedIntelBaseException):
    status_code = 429
    error_code = "RATE_LIMIT_EXCEEDED"
    message = "Too many requests. Please slow down and try again in a moment."
