# MedIntel AI Interview Guide

## 1. What This Project Is

MedIntel AI is a medication-safety assistant built to help users understand medicines, scan medicine packages, check drug interactions, manage medication schedules, and chat with an AI assistant that answers using verified medicine context.

The product is focused on:

- Medicine understanding in simple language
- Safety-first drug interaction checking
- OCR-based medicine scanning
- Medication reminders and schedule tracking
- AI chat grounded in medicine data
- Strong warnings against diagnosis or prescription

## 2. Current Tech Stack

The current codebase uses:

- Frontend: React, Vite, TypeScript
- Routing: React Router
- State: Zustand
- Data fetching: Axios + React Query
- Backend: FastAPI
- Database: MongoDB with Beanie/Motor
- Cache: Redis
- AI services: Gemini for OCR and interaction analysis, plus LLM-based chat fallback logic

Important note:

- Some docs mention PostgreSQL, Flutter, or a stricter Clean Architecture diagram, but the current runtime code is a React web app with a FastAPI + MongoDB backend.

## 3. Main User Flow

1. User registers or logs in.
2. Frontend stores JWT tokens and sends them with API requests.
3. User scans a medicine image or searches medicines.
4. Backend retrieves or extracts medicine information.
5. User can check drug interactions or create medication schedules.
6. User can chat with the AI assistant for medicine-related questions.
7. The system keeps history for scans, conversations, interactions, and schedules.

## 4. Backend Architecture

The backend is organized around these API groups:

- `/auth` for registration, login, refresh, logout, and current user profile
- `/medicines` for search, detail, and active medicines
- `/scans` for OCR medicine scanning
- `/conversations` for AI chat and voice-based AI flow
- `/interactions` for drug interaction checks
- `/schedules` for medication schedule management and adherence
- `/profile` for patient profile data

## 5. What Each Module Does

### Authentication

- Register new users
- Login with email and password
- Issue access and refresh JWT tokens
- Lock accounts after repeated failed attempts
- Return the current authenticated user

### Medicines

- Search medicines by name or generic name
- Return medicine details
- Return a user's active medicines

### Scans

- Accept medicine package images
- Validate file type and size
- Use Gemini Vision OCR to extract text
- Match extracted text with medicine records
- Save scan history

### Interactions

- Check interactions between selected medicines
- Use AI-assisted analysis with clinical prompt rules
- Store interaction checks in history

### Schedules

- Create medication schedules
- Track dose status
- Support adherence reporting
- Show active schedules to the user

### Profile

- Store demographics
- Store allergies and chronic conditions
- Store emergency contact details
- Personalize medicine guidance

### Conversations

- Support AI chat about medicines
- Retrieve medicine context before generating answers
- Keep responses educational and safety constrained
- Preserve conversation history

## 6. AI Design Explanation

The AI layer is not just a generic chatbot. It is designed as a safety-first medicine assistant.

The AI behavior is based on:

- Retrieval of medicine details from the database
- Prompt constraints that limit unsafe answers
- Safety guardrails to avoid diagnosis or prescription
- Disclaimer text reminding users to consult doctors or pharmacists
- Fallback responses if the external model fails

### Interview-safe explanation

If asked how AI is used, say:

> We use AI for medicine OCR, plain-language explanation, and drug-interaction analysis. The assistant is grounded in medicine data and constrained so it does not diagnose or prescribe.

## 7. Frontend Explanation

The frontend is a React single-page app with protected routes and a shared API client.

It includes:

- Login and register screens
- Dashboard
- Medicine scan page
- AI chat page
- Interaction checker
- Schedule page
- Medicine search and detail pages
- Profile page

The frontend uses:

- Zustand for auth state
- Axios interceptors for token attachment and refresh
- React Query for server-state caching
- A route guard pattern so unauthenticated users go to login

## 8. Data Model Summary

The MongoDB documents represent:

- Users
- Medicines
- Scans
- Conversations
- Messages
- Schedules
- Patient profiles
- Interaction records

This makes the app flexible because medical and AI-related records are naturally document-shaped and can evolve over time.

## 9. Security and Safety Points

He should be able to say the project includes:

- Password hashing
- JWT access and refresh tokens
- Token refresh flow
- Account lockout after repeated failed logins
- Rate limiting
- Structured error handling
- Medical disclaimers
- No diagnosis and no prescription behavior

## 10. How To Explain The Project In An Interview

### Short version

> MedIntel AI is a medication safety assistant that helps users scan medicines, understand them in simple language, check interactions, manage schedules, and ask medicine-related questions through a safety-constrained AI assistant.

### Slightly longer version

> The backend is built with FastAPI and MongoDB, while the frontend is a React/Vite web app. The system uses AI for OCR and medicine explanation, but all responses are constrained to stay educational and not provide diagnosis or prescription.

## 11. Common HR Questions And Good Answers

### What does this project do?

It helps users understand medicines, scan packages, check interactions, and manage schedules with AI support.

### What AI did you use?

Gemini is used for OCR and interaction analysis, and the chat flow uses retrieved medicine context to generate safe answers.

### Why did you use MongoDB?

Because the project stores flexible records like scans, conversations, schedules, and interaction history, which fit a document model well.

### How do you stop unsafe AI answers?

By grounding responses in medicine data, using prompt restrictions, and adding safety guardrails that block diagnosis or prescription language.

### What was your role?

If he did not personally build the full system, he should answer honestly and describe the parts he actually understood or contributed to.

### Is it production ready?

A safe answer is: the core product flow is implemented, but deployment automation and some production hardening tasks may still be pending.

## 12. Questions A Technical Interviewer May Ask

### 1. How does OCR work in this project?

The scan endpoint uploads a medicine image, validates it, sends it to Gemini Vision, extracts structured text, and then matches that output to medicine records.

### 2. How does the chat system avoid hallucination?

It pulls verified medicine context from the database, uses a constrained prompt, and returns educational answers with disclaimers.

### 3. How are tokens handled?

The system issues access and refresh tokens. The frontend stores them and attaches the access token to requests, refreshing when needed.

### 4. How do schedules and adherence work?

The system stores schedules in MongoDB and tracks dose completion history for adherence summaries.

### 5. Why is the medicine interaction checker useful?

It helps users understand risk when multiple medicines are used together, which is especially important in elderly care.

### 6. What are the major limitations?

It should not be used for diagnosis, it depends on medicine data quality, and the OCR and AI outputs still need human verification for medical use.

## 13. Resume Bullets He Can Use

Use only the bullets that are true for his actual involvement:

- Built a medication-safety assistant with FastAPI, React, MongoDB, Redis, and JWT authentication.
- Implemented medicine OCR scanning with AI-assisted extraction and database matching.
- Developed a drug-interaction checker and medication schedule/adherence workflow.
- Added retrieval-grounded AI chat with safety guardrails and medical disclaimers.
- Designed protected routes, token refresh handling, and structured API integration.

## 14. What He Should Not Claim

- Do not say the app is Flutter-based if discussing the current codebase.
- Do not say PostgreSQL is the active backend database if discussing the current codebase.
- Do not claim diagnostic or prescribing capability.
- Do not claim full clinical validation or regulatory approval unless that is actually true.
- Do not claim you built every part if you only understood or maintained part of the system.

## 15. Best One-Minute Pitch

> MedIntel AI is a medication assistant built to improve medicine safety and understanding. It lets users scan medicine packages, search verified medicine data, check drug interactions, and manage medication schedules. The AI layer is safety constrained and uses retrieved medicine context so the answers stay educational and do not diagnose or prescribe.

## 16. Best Final Advice For The Interview

He should keep the explanation simple, honest, and technically grounded. If he does not know a detail, he should say so instead of inventing one. The safest strategy is to explain the product flow, the stack, the AI safeguards, and the user value clearly.
