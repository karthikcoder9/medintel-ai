import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, User, Globe, Pill } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  role: z.string().min(1),
  language_pref: z.string().min(1),
})
type FormData = z.infer<typeof schema>

const ROLES = [
  { value: 'patient', label: '🧓 I am a Patient' },
  { value: 'caregiver', label: '👨‍👩‍👧 I am a Caregiver' },
  { value: 'medical_student', label: '🎓 Medical Student' },
  { value: 'healthcare_worker', label: '👩‍⚕️ Healthcare Worker' },
]

const LANGUAGES = [
  { value: 'en', label: 'English' }, { value: 'hi', label: 'हिन्दी' },
  { value: 'bn', label: 'বাংলা' }, { value: 'te', label: 'తెలుగు' },
  { value: 'mr', label: 'मराठी' }, { value: 'ta', label: 'தமிழ்' },
  { value: 'gu', label: 'ગુજરાતી' }, { value: 'kn', label: 'ಕನ್ನಡ' },
  { value: 'ml', label: 'മലയാളം' }, { value: 'pa', label: 'ਪੰਜਾਬੀ' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'patient', language_pref: 'en' },
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authService.register(data)
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.tokens)
        toast.success('Account created! Welcome to MedIntel AI 🎉')
        navigate('/dashboard')
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" style={{ background: 'var(--bg-base)' }}>
      <div className="reg-container animate-fade-in">
        <div className="reg-header">
          <div className="reg-logo">
            <Pill size={28} color="white" />
          </div>
          <div>
            <h1>Create Your Account</h1>
            <p>Join MedIntel AI and take control of your medication safety</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="reg-form">
          <div className="reg-grid">
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="full_name">Full Name</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input id="full_name" type="text" className={`input ${errors.full_name ? 'input-error' : ''}`}
                  placeholder="Your full name" {...register('full_name')} />
              </div>
              {errors.full_name && <p className="input-error-msg">{errors.full_name.message}</p>}
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com" {...register('email')} />
              </div>
              {errors.email && <p className="input-error-msg">{errors.email.message}</p>}
            </div>

            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="At least 8 chars, 1 uppercase, 1 number" {...register('password')} />
              </div>
              {errors.password && <p className="input-error-msg">{errors.password.message}</p>}
            </div>

            <div className="input-group">
              <label className="input-label">I am a...</label>
              <select className="input" {...register('role')}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">
                <Globe size={14} style={{ display: 'inline', marginRight: 4 }} />
                Preferred Language
              </label>
              <select className="input" {...register('language_pref')}>
                {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="disclaimer-banner" style={{ marginTop: 'var(--space-4)' }}>
            <span>⚠️</span>
            <span>
              MedIntel AI provides medication information only. It does not diagnose conditions
              or prescribe treatments. Always consult a qualified healthcare professional.
            </span>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg"
            disabled={loading} id="register-submit-btn" style={{ marginTop: 'var(--space-6)' }}>
            {loading
              ? <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Creating Account...</>
              : 'Create My Account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>

      <style>{`
        .reg-container {
          max-width: 580px; width: 100%;
          margin: var(--space-8) auto;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-2xl);
          padding: var(--space-10);
          box-shadow: var(--shadow-xl);
        }
        .reg-header {
          display: flex; align-items: center; gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .reg-logo {
          width: 52px; height: 52px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-glow-primary);
        }
        .reg-header h1 {
          font-family: var(--font-display);
          font-size: var(--text-xl); font-weight: var(--fw-bold);
          color: var(--text-primary);
        }
        .reg-header p { font-size: var(--text-sm); color: var(--text-secondary); margin-top: 2px; }
        .reg-form { display: flex; flex-direction: column; }
        .reg-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
        .auth-switch { text-align: center; font-size: var(--text-base); color: var(--text-secondary); margin-top: var(--space-6); }
        .auth-link { color: var(--color-primary-light); font-weight: var(--fw-semibold); }
        @media (max-width: 640px) { .reg-grid { grid-template-columns: 1fr; } .reg-grid > * { grid-column: unset !important; } }
      `}</style>
    </div>
  )
}
