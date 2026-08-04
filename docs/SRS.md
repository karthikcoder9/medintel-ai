# Software Requirements Specification (SRS)
# MedIntel AI — Explainable Multimodal AI Medication Understanding and Safety Assistant
**Version:** 1.0.0  
**Status:** Approved  
**Author:** MedIntel AI Engineering Team  
**Date:** 2026-08-01  

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Constraints](#5-system-constraints)
6. [Use Cases](#6-use-cases)
7. [User Stories](#7-user-stories)
8. [Assumptions and Dependencies](#8-assumptions-and-dependencies)

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the complete requirements for **MedIntel AI**, an Explainable Multimodal AI Medication Understanding and Safety Assistant designed specifically for elderly care. This document is the authoritative source for all feature requirements and serves as the contract between stakeholders and the engineering team.

### 1.2 Scope
MedIntel AI is a cross-platform healthcare assistant that:
- Recognizes medicines via camera (OCR on strips and bottles)
- Explains medicines in simple, accessible language
- Checks for drug-drug interactions
- Maintains personalized medication schedules
- Supports voice-first interactions
- Provides multilingual explanations
- Operates under strict medical safety constraints (no diagnosis, no prescription)

### 1.3 Definitions and Acronyms
| Term | Definition |
|------|-----------|
| OCR | Optical Character Recognition |
| RAG | Retrieval-Augmented Generation |
| LLM | Large Language Model |
| DDI | Drug-Drug Interaction |
| JWT | JSON Web Token |
| FAISS | Facebook AI Similarity Search |
| SRS | Software Requirements Specification |
| EHR | Electronic Health Record |
| HIPAA | Health Insurance Portability and Accountability Act |
| GDPR | General Data Protection Regulation |

### 1.4 References
- WHO Essential Medicines List
- FDA Drug Database (OpenFDA)
- RxNorm Drug Nomenclature System
- HIPAA Privacy Rule (45 CFR Parts 160 and 164)
- Material Design 3 Specification
- WCAG 2.1 Accessibility Guidelines

### 1.5 Overview
The remainder of this SRS describes the system in detail: overall description in Section 2, functional requirements in Section 3, non-functional requirements in Section 4, constraints in Section 5, use cases in Section 6, and user stories in Section 7.

---

## 2. Overall Description

### 2.1 Product Perspective
MedIntel AI is a standalone application that integrates with:
- OpenFDA API (drug database)
- RxNorm API (drug nomenclature)
- Google Cloud services (deployment)
- External LLM providers (Gemma/Llama via API or local quantized model)

The system follows a **client-server architecture** with a Flutter mobile frontend communicating with a Python/FastAPI backend over HTTPS REST APIs.

### 2.2 Product Functions (High-Level)
```
F-01  Medicine Recognition (Image → Medicine Name)
F-02  OCR Text Extraction (Image → Text → Medicine Name)
F-03  Medicine Information Retrieval (Name → Verified Data)
F-04  Plain Language Explanation (Medical → Simple Language)
F-05  Drug Interaction Checking (Medicine List → Interaction Report)
F-06  Medication Schedule Management (CRUD Schedules)
F-07  Medication Adherence Tracking (Schedule vs. Actual)
F-08  Voice Conversation Interface (Speech ↔ Text ↔ AI)
F-09  Multilingual Support (English + 10 regional languages)
F-10  Personalized Patient Profiles
F-11  Reminder Engine (Push Notifications)
F-12  AI Q&A Chatbot (Follow-up Questions)
F-13  Audit Logging (All AI interactions)
F-14  User Authentication & Authorization
```

### 2.3 User Classes and Characteristics

| User Class | Technical Proficiency | Primary Need | Special Considerations |
|-----------|----------------------|--------------|----------------------|
| **Elderly Patient** | Very Low | Understand their own medicines | Large UI, voice-first, simple language |
| **Family Caregiver** | Low-Medium | Monitor parent's medications | Remote access, alerts |
| **Professional Caregiver** | Medium | Manage multiple patients | Batch operations, schedule management |
| **Medical Student** | High | Learning drug interactions | Detailed clinical information |
| **Healthcare Worker** | High | Quick clinical reference | Accuracy, speed, citations |

### 2.4 Operating Environment
- **Mobile:** Android 8.0+, iOS 14.0+ (Flutter)
- **Web:** Chrome 90+, Firefox 88+, Safari 14+ (Flutter Web)
- **Backend:** Python 3.11+, Ubuntu 22.04 LTS
- **Database:** PostgreSQL 15+
- **Cache:** Redis 7.0+
- **Deployment:** Docker 24+, Google Cloud Run

### 2.5 Design and Implementation Constraints
- **CONSTRAINT-01:** The AI must NEVER diagnose diseases
- **CONSTRAINT-02:** The AI must NEVER prescribe treatments
- **CONSTRAINT-03:** All AI responses must include appropriate disclaimers
- **CONSTRAINT-04:** Medical information must come from verified sources only
- **CONSTRAINT-05:** PHI (Protected Health Information) must be encrypted at rest and in transit
- **CONSTRAINT-06:** System must comply with HIPAA and GDPR where applicable
- **CONSTRAINT-07:** Response latency must not exceed 5 seconds for standard queries

---

## 3. Functional Requirements

### 3.1 Authentication Module (AUTH)

| ID | Requirement | Priority |
|----|-------------|---------|
| AUTH-01 | System shall allow user registration with email and password | MUST |
| AUTH-02 | System shall authenticate users using JWT tokens | MUST |
| AUTH-03 | System shall support refresh token rotation | MUST |
| AUTH-04 | System shall enforce password complexity (min 8 chars, uppercase, number, special) | MUST |
| AUTH-05 | System shall support role-based access control (Patient, Caregiver, Admin) | MUST |
| AUTH-06 | System shall lock account after 5 failed login attempts for 15 minutes | MUST |
| AUTH-07 | System shall support biometric authentication (fingerprint, face ID) on mobile | SHOULD |
| AUTH-08 | System shall support social login (Google) | COULD |
| AUTH-09 | System shall provide secure password reset via email OTP | MUST |

### 3.2 Medicine Recognition Module (MED-REC)

| ID | Requirement | Priority |
|----|-------------|---------|
| MED-REC-01 | System shall accept image input (camera capture or gallery upload) | MUST |
| MED-REC-02 | System shall extract text from medicine strips using OCR | MUST |
| MED-REC-03 | System shall extract text from medicine bottles using OCR | MUST |
| MED-REC-04 | System shall support JPEG, PNG, HEIC, WebP image formats | MUST |
| MED-REC-05 | System shall achieve minimum 85% OCR accuracy on clear images | MUST |
| MED-REC-06 | System shall handle blurry images with quality warnings | SHOULD |
| MED-REC-07 | System shall extract: drug name, dosage, manufacturer, expiry date | MUST |
| MED-REC-08 | System shall normalize extracted text against drug name databases | MUST |
| MED-REC-09 | System shall provide confidence scores for recognition results | MUST |
| MED-REC-10 | System shall allow manual correction of OCR results | MUST |

### 3.3 Medicine Information Module (MED-INFO)

| ID | Requirement | Priority |
|----|-------------|---------|
| MED-INFO-01 | System shall retrieve verified medicine information from database/API | MUST |
| MED-INFO-02 | System shall display: drug class, mechanism, uses, dosage, side effects, precautions | MUST |
| MED-INFO-03 | System shall translate medical jargon to simple language (6th grade reading level) | MUST |
| MED-INFO-04 | System shall provide contraindications for elderly patients | MUST |
| MED-INFO-05 | System shall display food-drug interactions | MUST |
| MED-INFO-06 | System shall cite sources for all medical information | MUST |
| MED-INFO-07 | System shall always display medical disclaimer | MUST |
| MED-INFO-08 | System shall support multilingual explanations (10 languages) | SHOULD |

### 3.4 Drug Interaction Module (DDI)

| ID | Requirement | Priority |
|----|-------------|---------|
| DDI-01 | System shall check interactions between all medicines in a user's profile | MUST |
| DDI-02 | System shall classify interactions: Major, Moderate, Minor, None | MUST |
| DDI-03 | System shall explain interactions in plain language | MUST |
| DDI-04 | System shall recommend consulting a doctor for Major interactions | MUST |
| DDI-05 | System shall check interactions for newly added medicines against existing list | MUST |
| DDI-06 | System shall provide mechanism of interaction when known | SHOULD |
| DDI-07 | System shall generate printable interaction report | COULD |

### 3.5 Schedule & Adherence Module (SCHED)

| ID | Requirement | Priority |
|----|-------------|---------|
| SCHED-01 | System shall allow users to create medication schedules (time, dose, frequency) | MUST |
| SCHED-02 | System shall support frequencies: once daily, twice daily, three times daily, weekly, as needed | MUST |
| SCHED-03 | System shall send push notifications as medication reminders | MUST |
| SCHED-04 | System shall allow users to mark doses as taken/skipped/missed | MUST |
| SCHED-05 | System shall calculate adherence percentage over configurable periods | MUST |
| SCHED-06 | System shall alert caregivers when adherence drops below threshold | SHOULD |
| SCHED-07 | System shall maintain full medication history | MUST |
| SCHED-08 | System shall support linking to caregiver account for monitoring | SHOULD |

### 3.6 AI Conversation Module (AI-CONV)

| ID | Requirement | Priority |
|----|-------------|---------|
| AI-CONV-01 | System shall support natural language Q&A about medicines | MUST |
| AI-CONV-02 | System shall maintain conversation context across turns | MUST |
| AI-CONV-03 | System shall support voice input and text-to-speech output | MUST |
| AI-CONV-04 | System shall use RAG to ground responses in verified sources | MUST |
| AI-CONV-05 | System shall indicate when information is uncertain | MUST |
| AI-CONV-06 | System shall never provide diagnostic or prescriptive answers | MUST |
| AI-CONV-07 | System shall store conversation history per user | MUST |
| AI-CONV-08 | System shall support follow-up questions in context | MUST |
| AI-CONV-09 | System shall provide citations for all factual claims | MUST |
| AI-CONV-10 | System shall respond in the user's preferred language | SHOULD |

### 3.7 Patient Profile Module (PROFILE)

| ID | Requirement | Priority |
|----|-------------|---------|
| PROFILE-01 | System shall maintain user demographics (age, weight, height) | MUST |
| PROFILE-02 | System shall store known allergies | MUST |
| PROFILE-03 | System shall store chronic conditions | MUST |
| PROFILE-04 | System shall maintain current medication list | MUST |
| PROFILE-05 | System shall support emergency contact information | MUST |
| PROFILE-06 | System shall allow caregiver linkage | SHOULD |
| PROFILE-07 | System shall use profile to personalize AI responses | MUST |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
| ID | Requirement | Target |
|----|-------------|--------|
| PERF-01 | API response time for text queries | < 2 seconds (p95) |
| PERF-02 | API response time for AI/LLM queries | < 5 seconds (p95) |
| PERF-03 | OCR processing time | < 3 seconds (p95) |
| PERF-04 | System uptime | ≥ 99.5% |
| PERF-05 | Concurrent users supported | ≥ 1,000 |
| PERF-06 | Database query time | < 100ms (p99) |

### 4.2 Security Requirements
| ID | Requirement |
|----|-------------|
| SEC-01 | All data in transit encrypted via TLS 1.3 |
| SEC-02 | All PHI at rest encrypted via AES-256 |
| SEC-03 | JWT tokens expire in 15 minutes; refresh tokens in 7 days |
| SEC-04 | All API endpoints protected against SQL injection, XSS, CSRF |
| SEC-05 | Rate limiting: 100 req/min per user, 1000 req/min per IP |
| SEC-06 | All AI interactions logged for audit purposes |
| SEC-07 | PII must be anonymized in logs |
| SEC-08 | Secrets managed via environment variables / Cloud Secret Manager |

### 4.3 Usability Requirements
| ID | Requirement |
|----|-------------|
| UX-01 | Minimum font size 16sp for all body text |
| UX-02 | Minimum touch target size 48x48dp |
| UX-03 | WCAG 2.1 Level AA compliance |
| UX-04 | Screen reader support (TalkBack, VoiceOver) |
| UX-05 | High contrast mode support |
| UX-06 | Voice interaction as primary input method |
| UX-07 | Maximum 3 taps to reach any core feature |

### 4.4 Reliability and Availability
- **MTBF (Mean Time Between Failures):** ≥ 720 hours
- **MTTR (Mean Time to Recovery):** ≤ 30 minutes
- **Data Backup:** Daily automated backups with 30-day retention
- **Disaster Recovery RTO:** ≤ 4 hours
- **Disaster Recovery RPO:** ≤ 1 hour

### 4.5 Scalability Requirements
- Horizontal scaling via container orchestration
- Database connection pooling (max 100 connections)
- Redis caching for frequently accessed drug data
- CDN for static assets
- Auto-scaling based on CPU/memory thresholds

### 4.6 Maintainability Requirements
- Code coverage minimum: 80% for backend, 70% for frontend
- All public APIs documented with OpenAPI 3.0
- Structured logging (JSON format)
- Centralized error tracking
- Automated CI/CD pipeline

---

## 5. System Constraints

### 5.1 Legal and Regulatory Constraints
- Must comply with HIPAA Privacy Rule for US users
- Must comply with GDPR for EU users
- Must display FDA disclaimers for medical information
- Cannot provide medical advice, diagnosis, or prescriptions
- Must maintain audit trail for all AI-generated medical content

### 5.2 Technical Constraints
- Flutter minimum SDK: 3.16.0
- Python minimum version: 3.11
- LLM must be deployable on Google Cloud Run (quantized or API-backed)
- Docker image size must not exceed 4GB
- No PII may be sent to third-party LLM APIs without anonymization

### 5.3 Business Constraints
- All medical information must reference verified sources (FDA, WHO, RxNorm)
- AI responses must include disclaimer on every interaction
- System must be maintainable by a team of 3-5 engineers

---

## 6. Use Cases

### UC-01: Identify Medicine from Image
**Actor:** Elderly Patient  
**Precondition:** User is authenticated  
**Main Flow:**
1. User opens camera in app
2. User points camera at medicine strip/bottle
3. System captures image
4. System runs OCR engine to extract text
5. System normalizes extracted text against drug database
6. System retrieves medicine information
7. System displays simple explanation with voice narration

**Alternative Flow:**
- 4a. Image quality too low → System requests retake
- 5a. Medicine not found → System offers manual search

**Postcondition:** Medicine information displayed and logged

---

### UC-02: Check Drug Interactions
**Actor:** Family Caregiver  
**Precondition:** User has ≥ 2 medicines in profile  
**Main Flow:**
1. User navigates to Interaction Checker
2. System retrieves all medicines in user's profile
3. System queries drug interaction database
4. System generates interaction report
5. System displays interactions sorted by severity
6. System explains each interaction in plain language

**Postcondition:** Interaction report generated and stored

---

### UC-03: Ask AI a Question
**Actor:** Any user  
**Precondition:** User is authenticated  
**Main Flow:**
1. User opens AI Chat or speaks into microphone
2. System converts speech to text (if voice)
3. System sends query to RAG pipeline
4. RAG retrieves relevant drug documents
5. LLM generates response grounded in retrieved context
6. System validates response against safety guardrails
7. System displays response with citations
8. System offers text-to-speech playback

**Postcondition:** Conversation saved to history

---

### UC-04: Set Medication Reminder
**Actor:** Elderly Patient / Caregiver  
**Precondition:** Medicine exists in profile  
**Main Flow:**
1. User selects medicine from profile
2. User sets dosage amount, time, and frequency
3. System saves schedule to database
4. System schedules push notification
5. At reminder time, system sends notification
6. User marks dose as taken/skipped

**Postcondition:** Adherence record updated

---

## 7. User Stories

### Epic 1: Medicine Identification
- **US-001:** As an elderly patient, I want to photograph my medicine and see a simple explanation, so that I can understand what I am taking.
- **US-002:** As a caregiver, I want the app to read the medicine name aloud, so that I can help vision-impaired patients.
- **US-003:** As a medical student, I want to see the pharmacological class and mechanism, so that I can study drug properties.

### Epic 2: Drug Safety
- **US-004:** As an elderly patient with multiple medications, I want to check if my medicines interact, so that I stay safe.
- **US-005:** As a family member, I want to receive an alert when a dangerous drug combination is detected, so that I can contact the doctor immediately.

### Epic 3: Medication Management
- **US-006:** As an elderly patient, I want reminders when to take each medicine, so that I never miss a dose.
- **US-007:** As a caregiver, I want to monitor if my patient took their medicine today, so that I can follow up if they missed it.

### Epic 4: AI Assistance
- **US-008:** As an elderly patient, I want to ask the AI "What does this medicine do?" in my own language, so that I understand without reading complex text.
- **US-009:** As a healthcare worker, I want the AI to cite its sources, so that I can verify the information.

---

## 8. Assumptions and Dependencies

### Assumptions
- Users have a smartphone with camera capability
- Internet connectivity is available (offline mode is a future enhancement)
- Drug database (OpenFDA/RxNorm) APIs are accessible
- LLM is available via API or local quantized deployment

### Dependencies
| Dependency | Type | Risk |
|-----------|------|------|
| OpenFDA API | External API | Medium (rate limits) |
| RxNorm API | External API | Low (stable) |
| LLM Provider (Gemma/Llama) | AI Service | High (model availability) |
| Google Cloud Run | Infrastructure | Low |
| Firebase Cloud Messaging | Notifications | Low |
| Google Speech-to-Text | Voice | Medium |

### Out of Scope (v1.0)
- Offline mode
- EHR integration
- Insurance information
- Pharmacy locator
- Prescription management (upload/store)
- Wearable device integration
