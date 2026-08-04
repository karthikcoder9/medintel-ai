// MedIntel AI — TypeScript Type Definitions

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'patient' | 'caregiver' | 'medical_student' | 'healthcare_worker' | 'admin'
export type LanguageCode = 'en' | 'hi' | 'bn' | 'te' | 'mr' | 'ta' | 'gu' | 'kn' | 'ml' | 'pa' | 'ur'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  language_pref: LanguageCode
  is_verified: boolean
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthState {
  user: User | null
  tokens: TokenPair | null
  isAuthenticated: boolean
}

// ── Medicine ──────────────────────────────────────────────────────────────────
export interface SideEffects {
  common: string[]
  rare: string[]
  serious: string[]
}

export interface Medicine {
  id: string
  name: string
  generic_name: string
  drug_class?: string
  dosage_forms: string[]
  strengths: string[]
  description: string
  mechanism_of_action?: string
  indications?: string
  contraindications?: string
  side_effects: SideEffects
  precautions?: string
  elderly_warnings?: string
  food_interactions: string[]
  storage_instructions?: string
  is_otc: boolean
  simple_explanation?: string
  data_source: string
}

// ── Scan ──────────────────────────────────────────────────────────────────────
export interface ScanResult {
  scan_id: string
  medicine_name?: string
  generic_name?: string
  dosage_strength?: string
  dosage_form?: string
  manufacturer?: string
  expiry_date?: string
  instructions?: string
  confidence?: 'high' | 'medium' | 'low'
  matched_medicine_id?: string
  matched_medicine_name?: string
  raw_extracted_text?: string
}

// ── Interaction ───────────────────────────────────────────────────────────────
export type InteractionSeverity = 'major' | 'moderate' | 'minor' | 'none'

export interface DrugInteraction {
  drug_1: string
  drug_2: string
  severity: InteractionSeverity
  description: string
  clinical_effect: string
  management: string
  source: string
}

export interface InteractionCheckResult {
  record_id: string
  interactions: DrugInteraction[]
  has_major: boolean
  summary: string
}

// ── Schedule ──────────────────────────────────────────────────────────────────
export type FrequencyType =
  | 'once_daily' | 'twice_daily' | 'three_times_daily' | 'four_times_daily'
  | 'weekly' | 'biweekly' | 'monthly' | 'as_needed' | 'custom'

export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'pending'

export interface MedicationSchedule {
  id: string
  medicine_name: string
  dose_amount: number
  dose_unit: string
  frequency: FrequencyType
  times_of_day: string[]
  with_food?: boolean
  instructions?: string
  start_date?: string
  end_date?: string
  is_completed_today?: boolean
  taken_today_count?: number
  max_daily_doses?: number
}

export interface AdherenceStats {
  period_days: number
  total_doses: number
  taken: number
  missed: number
  skipped: number
  adherence_percentage: number
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export interface Citation {
  source: string
  url?: string
  excerpt?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  created_at: string
}

export interface Conversation {
  id: string
  title?: string
  last_message_at: string
  started_at: string
}

// ── Profile ───────────────────────────────────────────────────────────────────
export interface PatientProfile {
  weight_kg?: number
  height_cm?: number
  blood_type?: string
  known_allergies: string[]
  chronic_conditions: string[]
  emergency_contact: {
    name?: string
    phone?: string
    relation?: string
  }
  notes?: string
}

// ── API Response ──────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T | null
  error_code?: string
  details?: unknown
}
