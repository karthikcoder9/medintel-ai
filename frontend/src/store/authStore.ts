// MedIntel AI — Zustand Auth Store
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, TokenPair } from '@/types'

interface AuthStore {
  user: User | null
  tokens: TokenPair | null
  isAuthenticated: boolean
  setAuth: (user: User, tokens: TokenPair) => void
  setTokens: (tokens: TokenPair) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setAuth: (user, tokens) => set({
        user,
        tokens,
        isAuthenticated: true,
      }),

      setTokens: (tokens) => set({ tokens }),

      logout: () => set({
        user: null,
        tokens: null,
        isAuthenticated: false,
      }),

      updateUser: (partial) => {
        const current = get().user
        if (current) {
          set({ user: { ...current, ...partial } })
        }
      },
    }),
    {
      name: 'medintel-auth',
      // Only persist user + tokens — not derived state
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
