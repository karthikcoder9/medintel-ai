# Software Design Document (SDD)
# MedIntel AI — Architecture & Design
**Version:** 1.0.0  
**Status:** Approved  
**Author:** MedIntel AI Engineering Team  
**Date:** 2026-08-01

---

## 1. System Architecture

### 1.1 Architectural Style: Clean Architecture

MedIntel AI uses **Clean Architecture** (Uncle Bob's concentric ring model) as its primary architectural style, combined with **Domain-Driven Design (DDD)** principles. This ensures:
- Complete independence of business rules from frameworks, UI, and databases
- Testability at every layer
- Clear separation of concerns

```
┌─────────────────────────────────────────────┐
│                  FRAMEWORKS                  │
│   Flutter UI | FastAPI | PostgreSQL | Redis  │
├─────────────────────────────────────────────┤
│              INTERFACE ADAPTERS              │
│  Controllers | Presenters | Gateways | Repos │
├─────────────────────────────────────────────┤
│              APPLICATION LAYER               │
│   Use Cases | Services | DTOs | Validators   │
├─────────────────────────────────────────────┤
│                DOMAIN LAYER                  │
│   Entities | Value Objects | Domain Events   │
│   Repository Interfaces | Domain Services    │
└─────────────────────────────────────────────┘
```

### 1.2 System Overview Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                           │
│                                                              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │            Flutter Application (Mobile/Web)          │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │   │
│   │  │  Camera  │  │  Voice   │  │   UI Components  │  │   │
│   │  │  Module  │  │  Module  │  │  (MD3 Design)    │  │   │
│   │  └────┬─────┘  └────┬─────┘  └────────┬─────────┘  │   │
│   │       └─────────────┴─────────────────┘            │   │
│   │                      │                              │   │
│   │               HTTP/HTTPS + JWT                      │   │
│   └─────────────────────┬────────────────────────────────┘   │
└─────────────────────────┼────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                      API GATEWAY TIER                         │
│                 (FastAPI / Nginx / Cloud Run)                  │
│                                                              │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │   Auth   │  │  Rate    │  │   CORS   │  │   Load   │   │
│   │ Middleware│  │ Limiter  │  │ Handler  │  │ Balancer │   │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                     SERVICE TIER                              │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐   │
│  │  Medicine   │ │    Drug     │ │   AI/RAG Service    │   │
│  │  Service   │ │ Interaction │ │  ┌───────────────┐  │   │
│  │            │ │  Service   │ │  │  OCR Engine   │  │   │
│  └─────────────┘ └─────────────┘ │  ├───────────────┤  │   │
│  ┌─────────────┐ ┌─────────────┐ │  │ RAG Pipeline  │  │   │
│  │  Schedule   │ │   Patient   │ │  ├───────────────┤  │   │
│  │  Service   │ │   Profile   │ │  │  LLM Engine   │  │   │
│  │            │ │  Service   │ │  └───────────────┘  │   │
│  └─────────────┘ └─────────────┘ └─────────────────────┘   │
└─────────────────────────┬────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────┐
│                      DATA TIER                               │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │  PostgreSQL  │ │    Redis     │ │   FAISS Vector Store │ │
│  │  (Primary DB)│ │   (Cache)   │ │   (Embeddings)       │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Backend Architecture

### 2.1 Module Breakdown

```
backend/
├── app/
│   ├── api/                          # Interface Adapters (Controllers)
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── auth.py           # Authentication endpoints
│   │   │   │   ├── medicines.py      # Medicine recognition & info
│   │   │   │   ├── interactions.py   # Drug interaction checking
│   │   │   │   ├── schedules.py      # Medication scheduling
│   │   │   │   ├── conversations.py  # AI chat endpoints
│   │   │   │   ├── profiles.py       # Patient profiles
│   │   │   │   └── reminders.py      # Reminder management
│   │   │   └── router.py
│   │   └── dependencies.py           # DI Container
│   │
│   ├── core/                         # Framework Configuration
│   │   ├── config.py                 # Settings (Pydantic BaseSettings)
│   │   ├── security.py               # JWT, password hashing
│   │   ├── database.py               # SQLAlchemy engine & session
│   │   ├── redis.py                  # Redis connection
│   │   ├── logging.py                # Structured logging
│   │   └── exceptions.py             # Custom exception classes
│   │
│   ├── domain/                       # INNERMOST LAYER — Business Rules
│   │   ├── entities/
│   │   │   ├── user.py               # User entity
│   │   │   ├── medicine.py           # Medicine entity
│   │   │   ├── interaction.py        # Drug interaction entity
│   │   │   ├── schedule.py           # Medication schedule entity
│   │   │   ├── conversation.py       # AI conversation entity
│   │   │   └── reminder.py           # Reminder entity
│   │   ├── value_objects/
│   │   │   ├── dosage.py             # Dosage value object
│   │   │   ├── email.py              # Email value object
│   │   │   └── drug_name.py          # Normalized drug name
│   │   ├── repositories/             # Repository interfaces (abstract)
│   │   │   ├── user_repository.py
│   │   │   ├── medicine_repository.py
│   │   │   └── ...
│   │   └── services/                 # Domain services
│   │       ├── interaction_domain_service.py
│   │       └── adherence_calculator.py
│   │
│   ├── application/                  # Use Cases & Application Services
│   │   ├── use_cases/
│   │   │   ├── auth/
│   │   │   │   ├── register_user.py
│   │   │   │   ├── login_user.py
│   │   │   │   └── refresh_token.py
│   │   │   ├── medicine/
│   │   │   │   ├── recognize_medicine.py
│   │   │   │   ├── get_medicine_info.py
│   │   │   │   └── search_medicine.py
│   │   │   ├── interaction/
│   │   │   │   └── check_interactions.py
│   │   │   ├── schedule/
│   │   │   │   ├── create_schedule.py
│   │   │   │   ├── mark_dose_taken.py
│   │   │   │   └── get_adherence.py
│   │   │   └── ai/
│   │   │       ├── ask_question.py
│   │   │       └── get_conversation_history.py
│   │   ├── services/                 # Application services
│   │   │   ├── ocr_service.py
│   │   │   ├── rag_service.py
│   │   │   ├── llm_service.py
│   │   │   ├── notification_service.py
│   │   │   └── drug_database_service.py
│   │   └── dtos/                     # Data Transfer Objects
│   │       ├── medicine_dto.py
│   │       ├── user_dto.py
│   │       └── ...
│   │
│   ├── infrastructure/               # External Adapters (Repos, APIs)
│   │   ├── repositories/             # Concrete repository implementations
│   │   │   ├── postgres/
│   │   │   │   ├── user_repository.py
│   │   │   │   ├── medicine_repository.py
│   │   │   │   └── ...
│   │   │   └── cache/
│   │   │       └── redis_medicine_cache.py
│   │   ├── external/                 # External API clients
│   │   │   ├── openfda_client.py
│   │   │   ├── rxnorm_client.py
│   │   │   └── speech_to_text_client.py
│   │   ├── ai/                       # AI Infrastructure
│   │   │   ├── ocr/
│   │   │   │   └── easyocr_engine.py
│   │   │   ├── rag/
│   │   │   │   ├── document_loader.py
│   │   │   │   ├── chunker.py
│   │   │   │   ├── embedder.py
│   │   │   │   ├── vector_store.py   # FAISS wrapper
│   │   │   │   ├── retriever.py
│   │   │   │   └── rag_pipeline.py
│   │   │   └── llm/
│   │   │       ├── llm_client.py     # LLM abstraction
│   │   │       ├── prompt_templates.py
│   │   │       ├── safety_checker.py
│   │   │       └── citation_generator.py
│   │   └── models/                   # SQLAlchemy ORM models
│   │       ├── user_model.py
│   │       ├── medicine_model.py
│   │       └── ...
│   │
│   └── main.py                       # FastAPI application entry point
│
├── migrations/                       # Alembic database migrations
├── tests/                            # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                          # Utility scripts
│   ├── seed_data.py
│   └── ingest_drug_knowledge.py
├── Dockerfile
├── requirements.txt
├── requirements-dev.txt
└── alembic.ini
```

### 2.2 Dependency Injection Pattern

MedIntel AI uses **FastAPI's built-in Dependency Injection** system with a service locator for complex dependencies:

```python
# Pattern: Use Cases receive repositories via DI
class RecognizeMedicineUseCase:
    def __init__(
        self,
        ocr_service: OCRService,         # injected
        medicine_repo: MedicineRepository,  # injected
        drug_db_service: DrugDatabaseService,  # injected
        cache_service: CacheService,      # injected
    ): ...
```

### 2.3 Repository Pattern

All data access goes through repository interfaces defined in the domain layer:

```python
# Domain layer (abstract interface)
class MedicineRepository(ABC):
    @abstractmethod
    async def find_by_name(self, name: str) -> Optional[Medicine]: ...
    
    @abstractmethod
    async def save(self, medicine: Medicine) -> Medicine: ...

# Infrastructure layer (concrete implementation)
class PostgresMedicineRepository(MedicineRepository):
    async def find_by_name(self, name: str) -> Optional[Medicine]:
        # SQLAlchemy implementation
        ...
```

---

## 3. Frontend Architecture (Flutter)

### 3.1 Flutter Architecture: BLoC + Clean Architecture

```
lib/
├── core/
│   ├── di/                           # GetIt service locator
│   ├── network/                      # Dio HTTP client
│   ├── theme/                        # MD3 theme tokens
│   ├── router/                       # GoRouter navigation
│   └── utils/                        # Shared utilities
│
├── features/
│   ├── auth/
│   │   ├── data/                     # Data sources, repos impl
│   │   ├── domain/                   # Entities, use cases, repo interfaces
│   │   └── presentation/             # BLoC, Pages, Widgets
│   ├── medicine_scan/
│   ├── medicine_info/
│   ├── drug_interaction/
│   ├── schedule/
│   ├── ai_chat/
│   ├── profile/
│   └── dashboard/
│
└── main.dart
```

### 3.2 State Management: BLoC Pattern

Each feature follows the BLoC (Business Logic Component) pattern:
- **Events** → BLoC → **States**
- UI listens to states and dispatches events
- No business logic in widgets

---

## 4. AI Pipeline Architecture

### 4.1 RAG Pipeline

```
User Query
    │
    ▼
┌─────────────────┐
│  Query Processor │  ← Spell correction, intent detection
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Embedder     │  ← SentenceTransformers (all-MiniLM-L6-v2)
└────────┬────────┘
         │ Query Embedding (vector)
         ▼
┌─────────────────┐
│  FAISS Retriever│  ← Top-k document retrieval (k=5)
└────────┬────────┘
         │ Retrieved Chunks
         ▼
┌─────────────────┐
│ Context Builder │  ← Merge retrieved docs + user profile
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Prompt Template │  ← Structured prompt with guardrails
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   LLM (Gemma)   │  ← Generate response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Safety Checker  │  ← Block diagnosis/prescription claims
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Citation Generator│  ← Attach source references
└────────┬────────┘
         │
         ▼
    Final Response
```

### 4.2 OCR Pipeline

```
Image Input
    │
    ▼
┌─────────────────┐
│ Image Validator │  ← Format, size, quality check
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Preprocessor    │  ← Deskew, denoise, sharpen, binarize
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EasyOCR Engine │  ← Multi-language text detection
└────────┬────────┘
         │ Raw text + confidence scores
         ▼
┌─────────────────┐
│  Text Normalizer│  ← Clean, deduplicate, structure
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Drug Name Matcher│  ← Fuzzy match against drug name DB
└────────┬────────┘
         │
         ▼
    Recognized Medicine
```

---

## 5. Database Design

### 5.1 ER Diagram (Textual Representation)

```
USERS ──────────────┐
  user_id (PK)      │
  email              │
  password_hash      │
  full_name          │
  date_of_birth      │
  role               │
  language_preference│
  created_at         │
  updated_at         │
        │            │
        │ 1:N        │
        ▼            │
PATIENT_PROFILES     │
  profile_id (PK)    │
  user_id (FK)       │
  weight_kg          │
  height_cm          │
  known_allergies    │
  chronic_conditions │
  emergency_contact  │
        │            │
        │ 1:N        │
        ▼            │
USER_MEDICINES       │
  user_medicine_id(PK)│
  user_id (FK)       │
  medicine_id (FK)   │ ←────── MEDICINES
  added_at           │           medicine_id (PK)
        │            │           name
        │ 1:N        │           generic_name
        ▼            │           drug_class
MEDICATION_SCHEDULES │           dosage_forms
  schedule_id (PK)   │           manufacturer
  user_medicine_id(FK)           description
  dose_amount        │           side_effects
  dose_unit          │           contraindications
  frequency          │           created_at
  times_of_day[]     │
  start_date         │
  end_date           │
        │
        │ 1:N
        ▼
MEDICATION_HISTORY
  history_id (PK)
  schedule_id (FK)
  user_id (FK)
  scheduled_time
  taken_time
  status (taken/skipped/missed)
  notes

INTERACTION_RECORDS
  interaction_id (PK)
  user_id (FK)
  medicine_1_id (FK)
  medicine_2_id (FK)
  severity (major/moderate/minor/none)
  description
  checked_at

AI_CONVERSATIONS
  conversation_id (PK)
  user_id (FK)
  started_at
  last_message_at
  title

AI_MESSAGES
  message_id (PK)
  conversation_id (FK)
  role (user/assistant)
  content
  citations (JSONB)
  created_at

REMINDERS
  reminder_id (PK)
  schedule_id (FK)
  user_id (FK)
  reminder_time
  status (pending/sent/acknowledged)
  sent_at

AUDIT_LOGS
  log_id (PK)
  user_id (FK)
  action
  resource_type
  resource_id
  ip_address
  user_agent
  created_at
```

---

## 6. API Design Principles

### 6.1 Versioning
All APIs are versioned: `/api/v1/...`

### 6.2 Standard Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful",
  "errors": null,
  "metadata": {
    "request_id": "uuid",
    "timestamp": "2026-08-01T09:00:00Z",
    "version": "1.0.0"
  }
}
```

### 6.3 Error Response Format
```json
{
  "success": false,
  "data": null,
  "message": "Validation error",
  "errors": [
    {
      "field": "email",
      "code": "INVALID_FORMAT",
      "message": "Email format is invalid"
    }
  ],
  "metadata": { ... }
}
```

### 6.4 HTTP Status Code Convention
| Code | Usage |
|------|-------|
| 200 | Successful GET, PUT |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized (token missing/expired) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate resource) |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 7. Security Architecture

### 7.1 Authentication Flow
```
Client → POST /auth/login → Server validates credentials
       ← Access Token (15min) + Refresh Token (7 days)

Client → API request with Bearer token
       → JWT middleware validates signature & expiry
       → Request proceeds or 401 returned

Client → POST /auth/refresh → Server validates refresh token
       ← New Access Token + Rotated Refresh Token
```

### 7.2 Data Encryption
- **In Transit:** TLS 1.3 (enforced via Cloud Run)
- **At Rest:** PostgreSQL: pgcrypto for PHI fields
- **Passwords:** bcrypt (cost factor 12)
- **Tokens:** RS256 JWT (asymmetric signing)

### 7.3 Input Validation Layers
1. **Flutter:** Client-side validation
2. **FastAPI:** Pydantic model validation
3. **Service Layer:** Business rule validation
4. **Database:** Constraints and types

---

## 8. Deployment Architecture

```
                    ┌─────────────────────────┐
                    │    GitHub Actions CI/CD   │
                    │  build → test → push → deploy│
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Google Artifact Registry│
                    │   (Docker Images)         │
                    └────────────┬────────────┘
                                 │
┌────────────────────────────────▼──────────────────────────┐
│                    Google Cloud Platform                    │
│                                                            │
│  ┌──────────────┐     ┌──────────────┐                    │
│  │  Cloud Run   │     │  Cloud Run   │                    │
│  │  (Backend)   │     │  (Flutter Web│                    │
│  │  Auto-scale  │     │   optional)  │                    │
│  └──────┬───────┘     └──────────────┘                    │
│         │                                                  │
│  ┌──────▼───────┐     ┌──────────────┐  ┌──────────────┐ │
│  │  Cloud SQL   │     │  Memorystore │  │  Cloud       │ │
│  │  PostgreSQL  │     │  Redis       │  │  Storage     │ │
│  └──────────────┘     └──────────────┘  │  (FAISS Index│ │
│                                          │  & Images)   │ │
│  ┌──────────────┐                        └──────────────┘ │
│  │  Secret      │                                         │
│  │  Manager     │                                         │
│  └──────────────┘                                         │
└────────────────────────────────────────────────────────────┘
```

---

## 9. Testing Strategy

### 9.1 Testing Pyramid
```
          ┌───┐
         │ E2E │         ← 10% (Playwright/Appium)
        └─────┘
       ┌───────┐
      │Integration│       ← 30% (pytest + testcontainers)
     └───────────┘
    ┌─────────────┐
   │    Unit Tests │      ← 60% (pytest, unittest)
  └───────────────┘
```

### 9.2 AI Testing Strategy
- **Hallucination Tests:** Known drug facts compared against LLM output
- **Safety Tests:** Ensure diagnostic/prescriptive language is blocked
- **RAG Quality Tests:** Recall@K and NDCG metrics
- **OCR Accuracy Tests:** Benchmark dataset of medicine images

### 9.3 Coverage Targets
| Module | Target Coverage |
|--------|----------------|
| Domain Layer | 95% |
| Application Layer | 90% |
| Infrastructure Layer | 75% |
| API Endpoints | 85% |
| Flutter UI | 70% |
