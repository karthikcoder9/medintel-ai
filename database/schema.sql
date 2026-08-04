-- ============================================================
-- MedIntel AI — Production Database Schema
-- Version: 1.0.0
-- Database: PostgreSQL 15+
-- Author: MedIntel AI Engineering Team
-- Date: 2026-08-01
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- ============================================================
-- ENUMERATIONS
-- ============================================================

CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'admin', 'medical_student', 'healthcare_worker');
CREATE TYPE interaction_severity AS ENUM ('major', 'moderate', 'minor', 'none', 'unknown');
CREATE TYPE dose_status AS ENUM ('taken', 'skipped', 'missed', 'pending');
CREATE TYPE frequency_type AS ENUM ('once_daily', 'twice_daily', 'three_times_daily', 'four_times_daily', 'weekly', 'biweekly', 'monthly', 'as_needed', 'custom');
CREATE TYPE reminder_status AS ENUM ('pending', 'sent', 'acknowledged', 'dismissed', 'failed');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE language_code AS ENUM ('en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'ur');
CREATE TYPE log_action AS ENUM ('login', 'logout', 'register', 'password_reset', 'medicine_scan', 'medicine_search', 'interaction_check', 'ai_query', 'schedule_created', 'dose_marked', 'profile_updated', 'admin_action');

-- ============================================================
-- TABLE: users
-- Central identity and authentication table
-- ============================================================

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,                              -- bcrypt hash
    full_name       VARCHAR(255) NOT NULL,
    phone_number    VARCHAR(20),
    date_of_birth   DATE,
    role            user_role NOT NULL DEFAULT 'patient',
    language_pref   language_code NOT NULL DEFAULT 'en',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts SMALLINT NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for users
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- ============================================================
-- TABLE: refresh_tokens
-- JWT refresh token rotation management
-- ============================================================

CREATE TABLE refresh_tokens (
    token_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash      TEXT NOT NULL UNIQUE,                       -- SHA-256 of token
    expires_at      TIMESTAMPTZ NOT NULL,
    is_revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at      TIMESTAMPTZ,
    ip_address      INET,
    user_agent      TEXT
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================
-- TABLE: patient_profiles
-- Extended health profile for personalized AI responses
-- ============================================================

CREATE TABLE patient_profiles (
    profile_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    weight_kg           DECIMAL(5, 2),
    height_cm           DECIMAL(5, 2),
    blood_type          VARCHAR(5),
    known_allergies     TEXT[],                                 -- Array of allergy strings
    chronic_conditions  TEXT[],                                 -- Array of condition strings
    current_medications TEXT[],                                 -- Quick reference list
    emergency_name      VARCHAR(255),
    emergency_phone     VARCHAR(20),
    emergency_relation  VARCHAR(100),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_profiles_user_id ON patient_profiles(user_id);

-- ============================================================
-- TABLE: caregiver_links
-- Links caregivers to patients they monitor
-- ============================================================

CREATE TABLE caregiver_links (
    link_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caregiver_id    UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    patient_id      UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    relationship    VARCHAR(100),                               -- 'son', 'daughter', 'nurse', etc.
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    permissions     JSONB NOT NULL DEFAULT '{"view_schedule": true, "view_history": true, "receive_alerts": true}'::jsonb,
    linked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (caregiver_id, patient_id),
    CONSTRAINT no_self_link CHECK (caregiver_id != patient_id)
);

CREATE INDEX idx_caregiver_links_caregiver ON caregiver_links(caregiver_id);
CREATE INDEX idx_caregiver_links_patient ON caregiver_links(patient_id);

-- ============================================================
-- TABLE: medicines
-- Master medicine catalogue (seeded from FDA/RxNorm)
-- ============================================================

CREATE TABLE medicines (
    medicine_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(500) NOT NULL,              -- Brand name
    generic_name            VARCHAR(500) NOT NULL,              -- INN generic name
    rxcui                   VARCHAR(50),                        -- RxNorm concept ID
    ndc_codes               TEXT[],                             -- NDC product codes
    drug_class              VARCHAR(255),                       -- Pharmacological class
    atc_code                VARCHAR(20),                        -- ATC classification
    dosage_forms            TEXT[],                             -- tablet, capsule, syrup, etc.
    strengths               TEXT[],                             -- 10mg, 20mg, etc.
    manufacturer            VARCHAR(255),
    description             TEXT NOT NULL,
    mechanism_of_action     TEXT,
    indications             TEXT,
    contraindications       TEXT,
    side_effects            JSONB,                              -- {"common": [], "rare": [], "serious": []}
    precautions             TEXT,
    elderly_warnings        TEXT,                               -- Specific warnings for elderly
    pregnancy_category      VARCHAR(10),
    food_interactions       TEXT[],
    storage_instructions    TEXT,
    is_otc                  BOOLEAN NOT NULL DEFAULT FALSE,
    is_controlled           BOOLEAN NOT NULL DEFAULT FALSE,
    data_source             VARCHAR(100) NOT NULL DEFAULT 'openfda',
    source_url              TEXT,
    last_synced_at          TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for medicines (critical for search performance)
CREATE INDEX idx_medicines_name ON medicines USING gin(name gin_trgm_ops);
CREATE INDEX idx_medicines_generic_name ON medicines USING gin(generic_name gin_trgm_ops);
CREATE INDEX idx_medicines_rxcui ON medicines(rxcui) WHERE rxcui IS NOT NULL;
CREATE INDEX idx_medicines_drug_class ON medicines(drug_class);
CREATE INDEX idx_medicines_is_otc ON medicines(is_otc);

-- Full-text search vector
ALTER TABLE medicines ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(generic_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(drug_class, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
    ) STORED;

CREATE INDEX idx_medicines_search ON medicines USING gin(search_vector);

-- ============================================================
-- TABLE: user_medicines
-- Medicines actively associated with a user's profile
-- ============================================================

CREATE TABLE user_medicines (
    user_medicine_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    medicine_id         UUID NOT NULL REFERENCES medicines(medicine_id),
    prescribed_by       VARCHAR(255),
    prescribed_date     DATE,
    reason              TEXT,                                   -- Why this medicine was prescribed
    custom_notes        TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    removed_at          TIMESTAMPTZ,
    UNIQUE (user_id, medicine_id)
);

CREATE INDEX idx_user_medicines_user_id ON user_medicines(user_id);
CREATE INDEX idx_user_medicines_medicine_id ON user_medicines(medicine_id);
CREATE INDEX idx_user_medicines_active ON user_medicines(user_id, is_active);

-- ============================================================
-- TABLE: medication_schedules
-- Dosing schedules linked to a user's medicine
-- ============================================================

CREATE TABLE medication_schedules (
    schedule_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_medicine_id    UUID NOT NULL REFERENCES user_medicines(user_medicine_id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    dose_amount         DECIMAL(8, 3) NOT NULL,
    dose_unit           VARCHAR(50) NOT NULL,                   -- 'mg', 'ml', 'tablet', 'capsule'
    frequency           frequency_type NOT NULL,
    times_of_day        TIME[] NOT NULL,                        -- Array of times, e.g. {08:00, 20:00}
    with_food           BOOLEAN,
    start_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date            DATE,
    instructions        TEXT,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medication_schedules_user ON medication_schedules(user_id, is_active);
CREATE INDEX idx_medication_schedules_user_medicine ON medication_schedules(user_medicine_id);

-- ============================================================
-- TABLE: medication_history
-- Detailed record of every dose event (taken/missed/skipped)
-- ============================================================

CREATE TABLE medication_history (
    history_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id         UUID NOT NULL REFERENCES medication_schedules(schedule_id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    medicine_id         UUID NOT NULL REFERENCES medicines(medicine_id),
    scheduled_datetime  TIMESTAMPTZ NOT NULL,
    taken_datetime      TIMESTAMPTZ,
    status              dose_status NOT NULL DEFAULT 'pending',
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medication_history_user_date ON medication_history(user_id, scheduled_datetime DESC);
CREATE INDEX idx_medication_history_schedule ON medication_history(schedule_id);
CREATE INDEX idx_medication_history_status ON medication_history(user_id, status);

-- ============================================================
-- TABLE: drug_interactions
-- Known drug-drug interaction database (seeded from DrugBank/FDA)
-- ============================================================

CREATE TABLE drug_interactions (
    interaction_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drug_1_id           UUID NOT NULL REFERENCES medicines(medicine_id),
    drug_2_id           UUID NOT NULL REFERENCES medicines(medicine_id),
    severity            interaction_severity NOT NULL,
    description         TEXT NOT NULL,
    mechanism           TEXT,
    clinical_effect     TEXT,
    management          TEXT,
    source              VARCHAR(255),
    source_url          TEXT,
    evidence_level      VARCHAR(50),                            -- 'established', 'theoretical', 'case_report'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (drug_1_id, drug_2_id),
    CONSTRAINT no_self_interaction CHECK (drug_1_id != drug_2_id)
);

CREATE INDEX idx_drug_interactions_drug1 ON drug_interactions(drug_1_id);
CREATE INDEX idx_drug_interactions_drug2 ON drug_interactions(drug_2_id);
CREATE INDEX idx_drug_interactions_severity ON drug_interactions(severity);

-- ============================================================
-- TABLE: user_interaction_records
-- Records of interaction checks performed for a user
-- ============================================================

CREATE TABLE user_interaction_records (
    record_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    medicines_checked   UUID[] NOT NULL,                        -- Array of medicine IDs checked
    interactions_found  JSONB NOT NULL DEFAULT '[]'::jsonb,    -- Summary of interactions found
    has_major           BOOLEAN NOT NULL DEFAULT FALSE,
    checked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_interaction_records_user ON user_interaction_records(user_id, checked_at DESC);

-- ============================================================
-- TABLE: reminders
-- Push notification reminders for medication schedules
-- ============================================================

CREATE TABLE reminders (
    reminder_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id         UUID NOT NULL REFERENCES medication_schedules(schedule_id) ON DELETE CASCADE,
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reminder_datetime   TIMESTAMPTZ NOT NULL,
    status              reminder_status NOT NULL DEFAULT 'pending',
    fcm_token           TEXT,                                   -- Firebase Cloud Messaging token
    sent_at             TIMESTAMPTZ,
    acknowledged_at     TIMESTAMPTZ,
    retry_count         SMALLINT NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_scheduled ON reminders(reminder_datetime, status)
    WHERE status = 'pending';

-- ============================================================
-- TABLE: ai_conversations
-- Top-level conversation sessions
-- ============================================================

CREATE TABLE ai_conversations (
    conversation_id     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title               VARCHAR(500),
    context_medicine_id UUID REFERENCES medicines(medicine_id),
    is_archived         BOOLEAN NOT NULL DEFAULT FALSE,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations(user_id, last_message_at DESC);

-- ============================================================
-- TABLE: ai_messages
-- Individual messages within a conversation
-- ============================================================

CREATE TABLE ai_messages (
    message_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id     UUID NOT NULL REFERENCES ai_conversations(conversation_id) ON DELETE CASCADE,
    role                message_role NOT NULL,
    content             TEXT NOT NULL,
    citations           JSONB,                                  -- [{"source": "FDA", "url": "...", "excerpt": "..."}]
    tokens_used         INTEGER,
    model_version       VARCHAR(100),
    retrieval_context   JSONB,                                  -- What RAG retrieved (for debugging)
    is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,         -- Safety flag
    flag_reason         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at ASC);
CREATE INDEX idx_ai_messages_flagged ON ai_messages(is_flagged) WHERE is_flagged = TRUE;

-- ============================================================
-- TABLE: questions_faq
-- Pre-answered common questions for quick retrieval
-- ============================================================

CREATE TABLE questions_faq (
    question_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text       TEXT NOT NULL,
    answer_text         TEXT NOT NULL,
    medicine_id         UUID REFERENCES medicines(medicine_id),
    category            VARCHAR(100),
    language            language_code NOT NULL DEFAULT 'en',
    helpful_count       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_questions_faq_medicine ON questions_faq(medicine_id);
CREATE INDEX idx_questions_faq_language ON questions_faq(language);

-- ============================================================
-- TABLE: audit_logs
-- Immutable security and compliance audit trail
-- ============================================================

CREATE TABLE audit_logs (
    log_id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action              log_action NOT NULL,
    resource_type       VARCHAR(100),
    resource_id         UUID,
    old_values          JSONB,
    new_values          JSONB,
    ip_address          INET,
    user_agent          TEXT,
    request_id          UUID,
    status_code         SMALLINT,
    duration_ms         INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs are append-only; only index by user and time
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- TABLE: medicine_ocr_scans
-- History of OCR scans performed by users
-- ============================================================

CREATE TABLE medicine_ocr_scans (
    scan_id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    image_storage_path  TEXT,                                   -- GCS path (not stored locally)
    raw_ocr_text        TEXT,
    processed_text      TEXT,
    recognized_medicine_id UUID REFERENCES medicines(medicine_id),
    confidence_score    DECIMAL(5, 4),                          -- 0.0 to 1.0
    was_corrected       BOOLEAN NOT NULL DEFAULT FALSE,
    corrected_by_user   TEXT,
    scan_duration_ms    INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medicine_ocr_scans_user ON medicine_ocr_scans(user_id, created_at DESC);

-- ============================================================
-- VIEWS
-- ============================================================

-- Current active medication list for a user
CREATE VIEW v_active_user_medicines AS
SELECT
    um.user_medicine_id,
    um.user_id,
    m.medicine_id,
    m.name AS medicine_name,
    m.generic_name,
    m.drug_class,
    um.prescribed_by,
    um.reason,
    um.added_at
FROM user_medicines um
JOIN medicines m ON um.medicine_id = m.medicine_id
WHERE um.is_active = TRUE;

-- Today's medication schedule with status
CREATE VIEW v_todays_schedule AS
SELECT
    mh.history_id,
    mh.user_id,
    m.name AS medicine_name,
    m.generic_name,
    ms.dose_amount,
    ms.dose_unit,
    ms.with_food,
    mh.scheduled_datetime,
    mh.taken_datetime,
    mh.status
FROM medication_history mh
JOIN medication_schedules ms ON mh.schedule_id = ms.schedule_id
JOIN user_medicines um ON ms.user_medicine_id = um.user_medicine_id
JOIN medicines m ON um.medicine_id = m.medicine_id
WHERE DATE(mh.scheduled_datetime AT TIME ZONE 'UTC') = CURRENT_DATE;

-- Adherence summary by user (last 30 days)
CREATE VIEW v_adherence_summary_30d AS
SELECT
    user_id,
    COUNT(*) AS total_doses,
    COUNT(*) FILTER (WHERE status = 'taken') AS taken_doses,
    COUNT(*) FILTER (WHERE status = 'missed') AS missed_doses,
    COUNT(*) FILTER (WHERE status = 'skipped') AS skipped_doses,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'taken')::DECIMAL /
        NULLIF(COUNT(*) FILTER (WHERE status IN ('taken', 'missed')), 0) * 100,
        2
    ) AS adherence_percentage
FROM medication_history
WHERE scheduled_datetime >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_patient_profiles_updated_at
    BEFORE UPDATE ON patient_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_medicines_updated_at
    BEFORE UPDATE ON medicines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_medication_schedules_updated_at
    BEFORE UPDATE ON medication_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_medication_history_updated_at
    BEFORE UPDATE ON medication_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update last_message_at when a message is inserted
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ai_conversations
    SET last_message_at = NOW()
    WHERE conversation_id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_messages_update_conversation
    AFTER INSERT ON ai_messages
    FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- ============================================================
-- SEED DATA — Medicine Categories (Reference)
-- ============================================================

INSERT INTO medicines (
    name, generic_name, drug_class, dosage_forms, description,
    mechanism_of_action, indications, side_effects, precautions,
    elderly_warnings, is_otc, data_source
) VALUES
(
    'Metformin 500mg', 'Metformin Hydrochloride',
    'Biguanide Antidiabetic',
    ARRAY['tablet'],
    'Metformin is the most commonly prescribed medication for type 2 diabetes. It works by reducing the amount of sugar your liver makes and helping your body use insulin more effectively.',
    'Decreases hepatic glucose production, decreases intestinal glucose absorption, and improves insulin sensitivity',
    'Type 2 diabetes mellitus, prevention of type 2 diabetes',
    '{"common": ["nausea", "diarrhea", "stomach upset", "metallic taste"], "rare": ["lactic acidosis", "vitamin B12 deficiency"], "serious": ["lactic acidosis (rare but serious)"]}',
    'Monitor kidney function regularly. Avoid in severe kidney disease. Temporarily stop before contrast dye procedures.',
    'Start with lowest dose. Monitor for vitamin B12 deficiency. Use with caution in elderly with kidney issues.',
    FALSE, 'openfda'
),
(
    'Aspirin 75mg', 'Acetylsalicylic Acid',
    'Antiplatelet / NSAID',
    ARRAY['tablet', 'enteric-coated tablet'],
    'Low-dose aspirin is used to prevent blood clots and reduce the risk of heart attack and stroke in people at high risk.',
    'Irreversibly inhibits cyclooxygenase (COX-1 and COX-2) enzymes, reducing thromboxane A2 synthesis in platelets',
    'Prevention of heart attack, stroke prevention, blood clot prevention',
    '{"common": ["stomach upset", "heartburn", "nausea"], "rare": ["stomach bleeding", "allergic reaction"], "serious": ["gastrointestinal bleeding", "hemorrhagic stroke"]}',
    'Take with food to reduce stomach irritation. Avoid alcohol. Consult doctor before stopping.',
    'Increased risk of bleeding in elderly. Take with food. Avoid if history of stomach ulcers.',
    TRUE, 'openfda'
),
(
    'Lisinopril 10mg', 'Lisinopril',
    'ACE Inhibitor / Antihypertensive',
    ARRAY['tablet'],
    'Lisinopril is used to treat high blood pressure (hypertension) and heart failure. It helps relax blood vessels so your heart does not have to work as hard.',
    'ACE inhibitor that prevents conversion of angiotensin I to angiotensin II, reducing vasoconstriction and aldosterone secretion',
    'Hypertension, heart failure, post-myocardial infarction, diabetic nephropathy',
    '{"common": ["dry cough", "dizziness", "headache", "fatigue"], "rare": ["angioedema", "high potassium levels"], "serious": ["angioedema (potentially life-threatening)", "kidney failure"]}',
    'Monitor blood pressure and kidney function regularly. Avoid potassium supplements unless directed.',
    'Start with low dose. High fall risk due to dizziness. Monitor kidney function closely.',
    FALSE, 'openfda'
);

-- ============================================================
-- GRANTS (Production security — principle of least privilege)
-- ============================================================

-- Create application user
-- CREATE USER medintel_app WITH PASSWORD 'CHANGE_THIS_IN_PRODUCTION';
-- GRANT CONNECT ON DATABASE medintel_db TO medintel_app;
-- GRANT USAGE ON SCHEMA public TO medintel_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medintel_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medintel_app;
-- REVOKE DELETE ON audit_logs FROM medintel_app;  -- Audit logs are immutable
