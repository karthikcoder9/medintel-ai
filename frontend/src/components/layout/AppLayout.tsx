import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Camera, MessageSquare, AlertTriangle,
  Clock, Pill, User, LogOut, Moon, Sun, Menu, X, Stethoscope, Globe
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/api'
import { useTranslation } from '@/i18n/i18nContext'
import { SUPPORTED_LANGUAGES, Language } from '@/i18n/translations'
import toast from 'react-hot-toast'

export default function AppLayout() {
  const { user, logout, tokens } = useAuthStore()
  const { language, setLanguage, t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  const navItems = [
    { path: '/dashboard', label: t('navDashboard', 'Dashboard'), icon: LayoutDashboard },
    { path: '/scan', label: t('navScan', 'Scan Medicine'), icon: Camera },
    { path: '/chat', label: t('navChat', 'AI Assistant'), icon: MessageSquare },
    { path: '/interactions', label: t('navInteractions', 'Interactions'), icon: AlertTriangle },
    { path: '/schedule', label: t('navSchedule', 'My Schedule'), icon: Clock },
    { path: '/medicines', label: t('navMedicines', 'Medicine Library'), icon: Pill },
    { path: '/profile', label: t('navProfile', 'My Profile'), icon: User },
  ]

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const handleLogout = async () => {
    try {
      if (tokens) await authService.logout(tokens.access_token, tokens.refresh_token)
    } catch { /* silent */ }
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Stethoscope size={20} color="white" />
          </div>
          <div>
            <div className="sidebar-logo-text">MedIntel <span>AI</span></div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>v1.0 • Healthcare AI</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main</div>
          {navItems.slice(0, 4).map(({ path, label, icon: Icon }) => (
            <a
              key={path}
              href={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(path); setSidebarOpen(false) }}
              aria-current={location.pathname === path ? 'page' : undefined}
            >
              <Icon size={20} className="nav-icon" />
              {label}
            </a>
          ))}

          <div className="nav-section-label">Medical</div>
          {navItems.slice(4).map(({ path, label, icon: Icon }) => (
            <a
              key={path}
              href={path}
              className={`nav-item ${location.pathname === path ? 'active' : ''}`}
              onClick={(e) => { e.preventDefault(); navigate(path); setSidebarOpen(false) }}
            >
              <Icon size={20} className="nav-icon" />
              {label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user?.full_name}</div>
              <div className="sidebar-user-role">{user?.role?.replace('_', ' ')}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-full" onClick={handleLogout}
            id="sidebar-logout-btn" style={{ marginTop: 'var(--space-3)', justifyContent: 'flex-start', gap: 'var(--space-2)' }}>
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <button className="btn btn-ghost btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ display: 'none' }} aria-label="Toggle menu" id="menu-toggle-btn">
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <div>
              <h2 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', lineHeight: 1 }}>
                {navItems.find(n => n.path === location.pathname)?.label ?? 'MedIntel AI'}
              </h2>
            </div>
          </div>
          <div className="header-right" style={{ gap: 'var(--space-3)' }}>
            {/* Language Selector Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                style={{
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid rgba(82, 183, 136, 0.25)',
                  background: 'rgba(18, 37, 32, 0.6)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Globe size={16} color="var(--color-primary-light)" />
                <span>{SUPPORTED_LANGUAGES.find(l => l.code === language)?.nativeName ?? 'English'}</span>
              </button>

              {langMenuOpen && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 180,
                    borderRadius: 'var(--radius-lg)',
                    padding: '6px',
                    zIndex: 1000,
                    boxShadow: 'var(--shadow-xl)',
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((langOption) => (
                    <button
                      key={langOption.code}
                      onClick={() => {
                        setLanguage(langOption.code)
                        setLangMenuOpen(false)
                        toast.success(`Language set to ${langOption.name} (${langOption.nativeName})`)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                        color: language === langOption.code ? 'var(--color-primary-light)' : 'var(--text-primary)',
                        background: language === langOption.code ? 'rgba(82, 183, 136, 0.18)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontWeight: language === langOption.code ? '600' : '400',
                      }}
                    >
                      <span>{langOption.nativeName}</span>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{langOption.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="disclaimer-banner" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}>
              ⚠️ Not medical advice
            </div>
            <button className="btn btn-ghost btn-icon" onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              id="theme-toggle-btn">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="header-avatar">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <Outlet />
      </div>

      <style>{`
        .sidebar-user { display: flex; align-items: center; gap: var(--space-3); }
        .sidebar-user-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: flex; align-items: center; justify-content: center;
          font-weight: var(--fw-bold); font-size: var(--text-base); color: white; flex-shrink: 0;
        }
        .sidebar-user-name { font-weight: var(--fw-semibold); font-size: var(--text-sm); color: var(--text-primary); }
        .sidebar-user-role { font-size: var(--text-xs); color: var(--text-muted); text-transform: capitalize; }
        .header-avatar {
          width: 38px; height: 38px; border-radius: 50%;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          display: flex; align-items: center; justify-content: center;
          font-weight: var(--fw-bold); font-size: var(--text-sm); color: white;
        }
        @media (max-width: 768px) {
          #menu-toggle-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
