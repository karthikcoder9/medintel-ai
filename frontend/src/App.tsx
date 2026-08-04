// ── App.tsx — Root router and layout ────────────────────────────────────────
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { useAuthStore } from '@/store/authStore'
import AppLayout from '@/components/layout/AppLayout'
import LoginPage from '@/features/auth/pages/LoginPage'
import RegisterPage from '@/features/auth/pages/RegisterPage'
import DashboardPage from '@/features/dashboard/pages/DashboardPage'
import ScanPage from '@/features/scan/pages/ScanPage'
import ChatPage from '@/features/ai-chat/pages/ChatPage'
import InteractionsPage from '@/features/interactions/pages/InteractionsPage'
import SchedulePage from '@/features/schedule/pages/SchedulePage'
import ProfilePage from '@/features/profile/pages/ProfilePage'
import MedicineSearchPage from '@/features/medicine/pages/MedicineSearchPage'
import MedicineDetailPage from '@/features/medicine/pages/MedicineDetailPage'

import { I18nProvider } from '@/i18n/i18nContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export default function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              fontSize: 'var(--text-base)',
              padding: '14px 18px',
            },
            success: { iconTheme: { primary: 'var(--color-accent)', secondary: 'white' } },
            error: { iconTheme: { primary: 'var(--color-danger)', secondary: 'white' } },
            duration: 4000,
          }}
        />

        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

          {/* Protected routes inside the app shell */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="scan" element={<ScanPage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="interactions" element={<InteractionsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="medicines" element={<MedicineSearchPage />} />
            <Route path="medicines/:id" element={<MedicineDetailPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </I18nProvider>
  )
}
