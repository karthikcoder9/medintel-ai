// MedIntel AI — Axios API Client + Service Layer
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'
import type {
  ApiResponse, User, TokenPair, Medicine, ScanResult,
  InteractionCheckResult, MedicationSchedule, AdherenceStats,
  ChatMessage, Conversation, PatientProfile
} from '@/types'

// ── Base Client ───────────────────────────────────────────────────────────────
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const tokens = useAuthStore.getState().tokens
  if (tokens?.access_token) {
    config.headers.Authorization = `Bearer ${tokens.access_token}`
  }
  return config
})

// Handle 401 — attempt token refresh once
let isRefreshing = false
apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!isRefreshing) {
        isRefreshing = true
        const { tokens, setTokens, logout } = useAuthStore.getState()
        if (tokens?.refresh_token) {
          try {
            const res = await axios.post<ApiResponse<TokenPair>>(
              `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}/auth/refresh`,
              { refresh_token: tokens.refresh_token }
            )
            if (res.data.success && res.data.data) {
              setTokens(res.data.data)
              original.headers.Authorization = `Bearer ${res.data.data.access_token}`
              isRefreshing = false
              return apiClient(original)
            }
          } catch {
            logout()
          }
        }
        isRefreshing = false
        logout()
      }
    }
    return Promise.reject(error)
  }
)

// ── AUTH SERVICE ──────────────────────────────────────────────────────────────
export const authService = {
  async register(data: {
    full_name: string; email: string; password: string;
    role: string; language_pref: string
  }) {
    const res = await apiClient.post<ApiResponse<{ user: User; tokens: TokenPair }>>('/auth/register', data)
    return res.data
  },

  async login(email: string, password: string) {
    const res = await apiClient.post<ApiResponse<{ user: User; tokens: TokenPair }>>('/auth/login', { email, password })
    return res.data
  },

  async logout(access_token: string, refresh_token: string) {
    await apiClient.post('/auth/logout', { access_token, refresh_token })
  },

  async getMe() {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me')
    return res.data
  },
}

// ── MEDICINE SERVICE ──────────────────────────────────────────────────────────
export const medicineService = {
  async search(q: string, limit = 10) {
    const res = await apiClient.get<ApiResponse<Medicine[]>>('/medicines/search', { params: { q, limit } })
    return res.data
  },

  async getById(id: string) {
    const res = await apiClient.get<ApiResponse<Medicine>>(`/medicines/${id}`)
    return res.data
  },

  async getMyMedicines() {
    const res = await apiClient.get<ApiResponse<Medicine[]>>('/medicines/my/list')
    return res.data
  },
}

// ── SCAN SERVICE ──────────────────────────────────────────────────────────────
export const scanService = {
  async scanImage(file: File) {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post<ApiResponse<ScanResult>>('/scans/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return res.data
  },

  async getScanHistory(limit = 20) {
    const res = await apiClient.get<ApiResponse<{ scan_id: string; medicine_name: string; confidence: number; created_at: string }[]>>('/scans/history', { params: { limit } })
    return res.data
  },
}

// ── INTERACTION SERVICE ───────────────────────────────────────────────────────
export const interactionService = {
  async check(medicine_ids: string[]) {
    const res = await apiClient.post<ApiResponse<InteractionCheckResult>>('/interactions/check', { medicine_ids })
    return res.data
  },

  async getHistory(limit = 10) {
    const res = await apiClient.get<ApiResponse<{ id: string; medicines: string[]; has_major: boolean; summary: string; checked_at: string }[]>>('/interactions/history', { params: { limit } })
    return res.data
  },
}

// ── SCHEDULE SERVICE ──────────────────────────────────────────────────────────
export const scheduleService = {
  async create(data: {
    medicine_id: string; dose_amount: number; dose_unit: string;
    frequency: string; times_of_day: string[]; with_food?: boolean;
    start_date: string; end_date?: string; instructions?: string;
    prescribed_by?: string; reason?: string
  }) {
    const res = await apiClient.post<ApiResponse<{ id: string; medicine_name: string }>>('/schedules/', data)
    return res.data
  },

  async getAll() {
    const res = await apiClient.get<ApiResponse<MedicationSchedule[]>>('/schedules/')
    return res.data
  },

  async deactivate(id: string) {
    const res = await apiClient.delete<ApiResponse<null>>(`/schedules/${id}`)
    return res.data
  },

  async markDose(params: { schedule_id?: string; history_id?: string; status?: string; notes?: string }) {
    const res = await apiClient.post<ApiResponse<null>>('/schedules/doses/mark', { status: 'taken', ...params })
    return res.data
  },

  async getAdherence(days = 30) {
    const res = await apiClient.get<ApiResponse<AdherenceStats>>('/schedules/adherence', { params: { days } })
    return res.data
  },
}

// ── CHAT SERVICE ──────────────────────────────────────────────────────────────
export const chatService = {
  async sendMessage(message: string, conversation_id?: string, medicine_id?: string) {
    const res = await apiClient.post<ApiResponse<{
      conversation_id: string; message_id: string;
      response: string; citations: any[]; is_flagged: boolean
    }>>('/conversations/chat', { message, conversation_id, medicine_id })
    return res.data
  },

  async sendVoice(audio: Blob, conversation_id?: string, medicine_id?: string) {
    const form = new FormData()
    form.append('audio', audio, 'voice.webm')
    if (conversation_id) form.append('conversation_id', conversation_id)
    if (medicine_id) form.append('medicine_id', medicine_id)
    const res = await apiClient.post<ApiResponse<{
      transcript: string; conversation_id: string; response: string; citations: any[]
    }>>('/conversations/voice', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    })
    return res.data
  },

  async textToSpeech(text: string): Promise<Blob> {
    const form = new FormData()
    form.append('text', text)
    const res = await apiClient.post('/conversations/tts', form, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getConversations(limit = 20) {
    const res = await apiClient.get<ApiResponse<Conversation[]>>('/conversations/', { params: { limit } })
    return res.data
  },

  async getMessages(conversation_id: string) {
    const res = await apiClient.get<ApiResponse<ChatMessage[]>>(`/conversations/${conversation_id}/messages`)
    return res.data
  },
}

// ── PROFILE SERVICE ───────────────────────────────────────────────────────────
export const profileService = {
  async get() {
    const res = await apiClient.get<ApiResponse<PatientProfile>>('/profile/')
    return res.data
  },

  async upsert(data: Partial<PatientProfile>) {
    const flat = {
      ...data,
      emergency_contact_name: data.emergency_contact?.name,
      emergency_contact_phone: data.emergency_contact?.phone,
      emergency_contact_relation: data.emergency_contact?.relation,
    }
    const res = await apiClient.put<ApiResponse<null>>('/profile/', flat)
    return res.data
  },
}

export default apiClient
