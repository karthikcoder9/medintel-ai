# MedIntel AI — Project Design Document
**Version:** 1.0.0 | **Type:** Web Application | **Date:** 2026-08-01

---

## Revised Tech Stack (Web)

| Category | Technology | Rationale |
|----------|-----------|-----------|
| **Frontend Framework** | React 18 + Vite + TypeScript | Industry standard, fast HMR, rich ecosystem |
| **UI Library** | Custom CSS Design System | Full control, no external framework dependencies |
| **State Management** | Zustand | Lightweight, TypeScript-first |
| **HTTP Client** | Axios + React Query | Caching, retries, optimistic updates |
| **Routing** | React Router v6 | File-based routing pattern |
| **Forms** | React Hook Form + Zod | Type-safe validation |
| **Icons** | Lucide React | Clean, healthcare-appropriate |
| **Charts** | Recharts | Adherence dashboards |
| **Animations** | Framer Motion | Micro-interactions |
| **Backend** | Python 3.11 + FastAPI | Async, OpenAPI auto-docs, high performance |
| **ORM** | SQLAlchemy 2.0 + Alembic | Async ORM, migrations |
| **Database** | PostgreSQL 15 | Relational, JSONB, FTS |
| **Cache** | Redis 7 | Session store, drug data cache |
| **Vector DB** | FAISS | Local vector similarity search |
| **OCR** | EasyOCR | Multi-language medicine text extraction |
| **Embeddings** | SentenceTransformers | all-MiniLM-L6-v2 model |
| **RAG** | LangChain | Pipeline orchestration |
| **LLM** | Google Gemini API (primary) + Ollama fallback | Healthcare-grade AI |
| **Auth** | JWT (RS256) + bcrypt | Stateless, secure |
| **Containerization** | Docker + Docker Compose | Dev parity |
| **Deployment** | Google Cloud Run | Serverless containers |
| **CI/CD** | GitHub Actions | Automated testing and deployment |

---

## Full Project Folder Structure

```
medintel-ai/
│
├── frontend/                          # React + Vite + TypeScript Web App
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── assets/                    # Images, fonts, icons
│   │   ├── components/                # Shared/reusable components
│   │   │   ├── ui/                    # Base UI components
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   ├── Badge.tsx
│   │   │   │   ├── Spinner.tsx
│   │   │   │   ├── Toast.tsx
│   │   │   │   └── Typography.tsx
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   └── Footer.tsx
│   │   │   └── shared/
│   │   │       ├── MedicineCard.tsx
│   │   │       ├── InteractionBadge.tsx
│   │   │       ├── AdherenceChart.tsx
│   │   │       └── VoiceButton.tsx
│   │   ├── features/                  # Feature modules
│   │   │   ├── auth/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── LoginPage.tsx
│   │   │   │   │   └── RegisterPage.tsx
│   │   │   │   ├── components/
│   │   │   │   └── store/authStore.ts
│   │   │   ├── scan/
│   │   │   │   ├── pages/ScanPage.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── CameraCapture.tsx
│   │   │   │   │   ├── ImageUploader.tsx
│   │   │   │   │   └── ScanResult.tsx
│   │   │   │   └── hooks/useOCR.ts
│   │   │   ├── medicine/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── MedicineSearchPage.tsx
│   │   │   │   │   └── MedicineDetailPage.tsx
│   │   │   │   └── components/
│   │   │   ├── interactions/
│   │   │   │   ├── pages/InteractionCheckerPage.tsx
│   │   │   │   └── components/InteractionReport.tsx
│   │   │   ├── schedule/
│   │   │   │   ├── pages/
│   │   │   │   │   ├── SchedulePage.tsx
│   │   │   │   │   └── AddSchedulePage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── ScheduleCalendar.tsx
│   │   │   │       └── DoseTracker.tsx
│   │   │   ├── ai-chat/
│   │   │   │   ├── pages/ChatPage.tsx
│   │   │   │   └── components/
│   │   │   │       ├── ChatWindow.tsx
│   │   │   │       ├── MessageBubble.tsx
│   │   │   │       ├── VoiceInput.tsx
│   │   │   │       └── CitationList.tsx
│   │   │   ├── profile/
│   │   │   │   ├── pages/ProfilePage.tsx
│   │   │   │   └── components/
│   │   │   └── dashboard/
│   │   │       ├── pages/DashboardPage.tsx
│   │   │       └── components/
│   │   │           ├── TodayScheduleWidget.tsx
│   │   │           ├── AdherenceWidget.tsx
│   │   │           ├── InteractionAlertWidget.tsx
│   │   │           └── QuickScanWidget.tsx
│   │   ├── hooks/                     # Global custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useVoice.ts
│   │   │   └── useToast.ts
│   │   ├── services/                  # API service layer
│   │   │   ├── api.ts                 # Axios base instance
│   │   │   ├── authService.ts
│   │   │   ├── medicineService.ts
│   │   │   ├── interactionService.ts
│   │   │   ├── scheduleService.ts
│   │   │   ├── chatService.ts
│   │   │   └── profileService.ts
│   │   ├── store/                     # Zustand global stores
│   │   │   ├── authStore.ts
│   │   │   └── notificationStore.ts
│   │   ├── types/                     # TypeScript interfaces
│   │   │   ├── auth.types.ts
│   │   │   ├── medicine.types.ts
│   │   │   ├── schedule.types.ts
│   │   │   └── chat.types.ts
│   │   ├── utils/                     # Utilities
│   │   │   ├── constants.ts
│   │   │   ├── dateUtils.ts
│   │   │   └── validators.ts
│   │   ├── styles/                    # Global CSS design system
│   │   │   ├── index.css              # CSS variables, reset
│   │   │   ├── tokens.css             # Design tokens
│   │   │   ├── typography.css
│   │   │   ├── components.css
│   │   │   └── animations.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── backend/                           # Python FastAPI Backend
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── auth.py
│   │   │       │   ├── medicines.py
│   │   │       │   ├── interactions.py
│   │   │       │   ├── schedules.py
│   │   │       │   ├── conversations.py
│   │   │       │   ├── profiles.py
│   │   │       │   └── scans.py
│   │   │       └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── database.py
│   │   │   ├── redis.py
│   │   │   └── exceptions.py
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── value_objects/
│   │   │   ├── repositories/
│   │   │   └── services/
│   │   ├── application/
│   │   │   ├── use_cases/
│   │   │   ├── services/
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   ├── repositories/
│   │   │   ├── external/
│   │   │   ├── ai/
│   │   │   │   ├── ocr/
│   │   │   │   ├── rag/
│   │   │   │   └── llm/
│   │   │   └── models/
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   ├── Dockerfile
│   └── requirements.txt
│
├── database/
│   ├── schema.sql
│   ├── seed_data.sql
│   └── migrations/
│
├── docs/
│   ├── SRS.md
│   ├── SDD.md
│   ├── API_SPEC.md
│   ├── PDD.md
│   └── DEPLOYMENT.md
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## API Specification Summary

### Base URL
```
Development: http://localhost:8000/api/v1
Production:  https://api.medintel.ai/api/v1
```

### Endpoint Groups

| Group | Base Path | Description |
|-------|-----------|-------------|
| Auth | `/auth` | Register, login, refresh, logout |
| Medicines | `/medicines` | Search, detail, user medicine list |
| Scans | `/scans` | Upload image, OCR recognition |
| Interactions | `/interactions` | Drug interaction check |
| Schedules | `/schedules` | CRUD medication schedules |
| History | `/history` | Dose history & adherence |
| Conversations | `/conversations` | AI chat sessions |
| Profile | `/profile` | Patient profile CRUD |
| Reminders | `/reminders` | Reminder management |

---

## Implementation Phases

### Phase 1 — Foundation (Current Step)
- [x] SRS Documentation
- [x] SDD Documentation  
- [x] Database Schema
- [x] Project Design Document
- [ ] Backend scaffold (FastAPI project structure)
- [ ] Database connection and migrations
- [ ] Core configuration

### Phase 2 — Authentication
- [ ] User registration/login API
- [ ] JWT middleware
- [ ] Frontend login/register pages

### Phase 3 — Medicine Core
- [ ] Medicine search API
- [ ] OCR scan API
- [ ] Frontend scan + search pages

### Phase 4 — AI Engine
- [ ] RAG pipeline
- [ ] LLM integration
- [ ] AI chat API + frontend

### Phase 5 — Safety Features
- [ ] Drug interaction checker
- [ ] Medication schedule manager
- [ ] Adherence dashboard

### Phase 6 — Polish & Deploy
- [ ] Docker + CI/CD
- [ ] Cloud deployment
- [ ] Performance testing
