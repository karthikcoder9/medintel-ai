# MedIntel AI 🏥

### Explainable Multimodal AI Medication Understanding and Safety Assistant

MedIntel AI is an explainable medication safety assistant that helps users scan medicines, understand drug information in simple language, check interactions, manage schedules, and chat with a safety-constrained AI assistant grounded in verified medicine data.

> ⚠️ **Medical Disclaimer:** MedIntel AI provides medication information for educational purposes only. It does NOT diagnose medical conditions or prescribe treatments. Always consult a qualified healthcare professional.

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker + Docker Compose
- MongoDB 7 (via Docker)
- Redis 7 (via Docker)

### 1. Clone and configure

```bash
cd "MedIntel AI"
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys:
# - GEMINI_API_KEY
# - OPENAI_API_KEY
```

### 2. Start with Docker Compose (recommended)

```bash
docker-compose up -d
```

This starts:

- **Backend API** at http://localhost:8000
- **Frontend** at http://localhost:5173
- **MongoDB** at localhost:27017
- **Redis** at localhost:6379

### 3. Run manually (development)

**Backend:**

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

### Streamlit deployment

To run the Streamlit front end locally:

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Set `API_BASE_URL` if the FastAPI backend is hosted somewhere other than `http://localhost:8000/api/v1`.

---

## 🗺️ Architecture

```
MedIntel AI/
├── backend/                # Python FastAPI
│   ├── app/
│   │   ├── api/v1/         # REST endpoints
│   │   ├── core/           # Config, security, DB, Redis
│   │   ├── infrastructure/ # MongoDB models, AI engines
│   │   └── main.py         # FastAPI app
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── features/       # Feature modules (auth, scan, chat, etc.)
│   │   ├── components/     # Shared UI components
│   │   ├── services/       # API service layer
│   │   ├── store/          # Zustand state
│   │   └── styles/         # CSS design system
│   └── Dockerfile
├── database/               # SQL schema (reference)
├── docs/                   # SRS, SDD, PDD
└── docker-compose.yml
```

---

## 🧠 AI Features

| Feature                    | Technology                   |
| -------------------------- | ---------------------------- |
| Medicine OCR               | Gemini Flash Vision          |
| Plain language explanation | Gemini Flash + RAG           |
| Drug interaction analysis  | Gemini Flash + clinical data |
| Voice input                | OpenAI Whisper-1             |
| Voice responses            | OpenAI TTS (nova voice)      |
| Knowledge retrieval        | FAISS + SentenceTransformers |

---

## 📡 API Documentation

Once running, visit:

- **Swagger UI:** http://localhost:8000/api/docs
- **ReDoc:** http://localhost:8000/api/redoc

### Key Endpoints

| Method | Path                                 | Description                |
| ------ | ------------------------------------ | -------------------------- |
| POST   | `/api/v1/auth/register`              | Register account           |
| POST   | `/api/v1/auth/login`                 | Login                      |
| POST   | `/api/v1/scans/`                     | Scan medicine image        |
| GET    | `/api/v1/medicines/search?q=aspirin` | Search medicines           |
| POST   | `/api/v1/interactions/check`         | Check drug interactions    |
| POST   | `/api/v1/conversations/chat`         | AI chat                    |
| POST   | `/api/v1/conversations/voice`        | Voice AI chat              |
| POST   | `/api/v1/schedules/`                 | Create medication schedule |
| GET    | `/api/v1/schedules/adherence`        | Get adherence stats        |

---

## 🛡️ Security

- JWT authentication (60-min access tokens, 7-day refresh)
- bcrypt password hashing (cost factor 12)
- Rate limiting (100 req/min per user)
- Account lockout after 5 failed attempts
- All AI responses validated against safety guardrails
- No medical diagnoses or prescriptions — ever

---

## 👥 User Roles

| Role              | Access                                         |
| ----------------- | ---------------------------------------------- |
| Patient           | Personal medicines, schedules, AI chat         |
| Caregiver         | Patient monitoring, shared access              |
| Medical Student   | Full medicine database, detailed clinical info |
| Healthcare Worker | All features + citation details                |
| Admin             | Full system access                             |

---

## 📋 Module Status

- [x] Backend Foundation (FastAPI + MongoDB + Redis)
- [x] Authentication (JWT + Role-based)
- [x] Medicine Recognition (Gemini Vision OCR)
- [x] Medicine Database (Search + Detail)
- [x] Drug Interaction Checker (AI-powered)
- [x] Medication Schedules + Adherence
- [x] AI Chat (RAG + Gemini Flash)
- [x] Voice Input/Output (Whisper + TTS)
- [x] Patient Profile
- [x] React Frontend (All pages)
- [x] Docker Compose
- [ ] CI/CD Pipeline (GitHub Actions)
- [ ] Cloud Deployment (Google Cloud Run)
- [ ] FAISS Vector Knowledge Base seeding
- [ ] Push Notifications

---

Built with ❤️ by the MedIntel AI Engineering Team
