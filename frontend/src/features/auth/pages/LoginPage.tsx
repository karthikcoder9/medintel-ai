import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Pill } from 'lucide-react'
import toast from 'react-hot-toast'
import { authService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      const res = await authService.login(data.email, data.password)
      if (res.success && res.data) {
        setAuth(res.data.user, res.data.tokens)
        toast.success(`Welcome back, ${res.data.user.full_name.split(' ')[0]}! 👋`)
        navigate('/dashboard')
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Please try again.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <Pill size={32} color="white" />
          </div>
          <div>
            <h1 className="auth-brand-name">MedIntel <span>AI</span></h1>
            <p className="auth-brand-tagline">Your Medication Safety Companion</p>
          </div>
        </div>

        <div className="auth-hero">
          <h2>Understand Your Medicines.<br />Stay Safe. Stay Informed.</h2>
          <p>
            AI-powered medication assistant that explains your medicines in simple language,
            checks for dangerous interactions, and helps you never miss a dose.
          </p>

          <div className="auth-features">
            {[
              { icon: '📷', text: 'Scan medicine strips & bottles instantly' },
              { icon: '🤖', text: 'Ask the AI in your own language' },
              { icon: '⚠️', text: 'Check dangerous drug interactions' },
              { icon: '⏰', text: 'Smart medication reminders' },
            ].map((f, i) => (
              <div className="auth-feature-item" key={i}>
                <span className="auth-feature-emoji">{f.icon}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="auth-disclaimer">
          <ShieldCheck size={16} />
          <span>Medical information only. We never diagnose or prescribe.</span>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container animate-scale-in">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your MedIntel AI account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={20} />
                <input
                  id="email"
                  type="email"
                  className={`input ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                  {...register('email')}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="input-error-msg">{errors.email.message}</p>}
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={20} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Your password"
                  {...register('password')}
                  autoComplete="current-password"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  className="input-eye-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="input-error-msg">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              id="login-submit-btn"
            >
              {loading ? (
                <><div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Signing In...</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">Create one free</Link>
          </p>
        </div>
      </div>

      <style>{`
        .auth-page {
          display: flex;
          min-height: 100vh;
          background: var(--bg-base);
        }

        .auth-left {
          flex: 1;
          background: linear-gradient(145deg, #0d1a3a 0%, #0a1628 50%, #0d2240 100%);
          padding: var(--space-12) var(--space-12);
          display: flex;
          flex-direction: column;
          gap: var(--space-10);
          position: relative;
          overflow: hidden;
        }

        .auth-left::before {
          content: '';
          position: absolute;
          top: -100px; right: -100px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-left::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -100px;
          width: 400px; height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .auth-brand { display: flex; align-items: center; gap: var(--space-4); position: relative; z-index: 1; }

        .auth-brand-icon {
          width: 56px; height: 56px;
          background: linear-gradient(135deg, var(--color-primary), var(--color-accent));
          border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-glow-primary);
        }

        .auth-brand-name {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--fw-extrabold);
          color: white;
          line-height: 1;
        }
        .auth-brand-name span { color: var(--color-accent-light); }
        .auth-brand-tagline { font-size: var(--text-sm); color: rgba(255,255,255,0.5); margin-top: 2px; }

        .auth-hero { position: relative; z-index: 1; }
        .auth-hero h2 {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--fw-bold);
          color: white;
          line-height: 1.3;
          margin-bottom: var(--space-4);
        }
        .auth-hero p { font-size: var(--text-md); color: rgba(255,255,255,0.6); line-height: 1.7; margin-bottom: var(--space-8); }

        .auth-features { display: flex; flex-direction: column; gap: var(--space-3); }
        .auth-feature-item {
          display: flex; align-items: center; gap: var(--space-3);
          font-size: var(--text-base); color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: var(--radius-lg);
          padding: var(--space-3) var(--space-4);
        }
        .auth-feature-emoji { font-size: 20px; }

        .auth-disclaimer {
          display: flex; align-items: center; gap: var(--space-2);
          font-size: var(--text-sm); color: rgba(255,255,255,0.4);
          position: relative; z-index: 1;
        }

        .auth-right {
          width: 480px;
          background: var(--bg-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) var(--space-10);
        }

        .auth-form-container { width: 100%; }

        .auth-form-header { margin-bottom: var(--space-8); }
        .auth-form-header h2 {
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: var(--fw-bold);
          color: var(--text-primary);
          margin-bottom: var(--space-2);
        }
        .auth-form-header p { color: var(--text-secondary); font-size: var(--text-base); }

        .auth-form { display: flex; flex-direction: column; gap: var(--space-5); margin-bottom: var(--space-6); }

        .input-eye-btn {
          position: absolute;
          right: 14px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          background: none; border: none;
          cursor: pointer; padding: 4px;
        }
        .input-eye-btn:hover { color: var(--text-secondary); }

        .auth-switch { text-align: center; font-size: var(--text-base); color: var(--text-secondary); }
        .auth-link { color: var(--color-primary-light); font-weight: var(--fw-semibold); }
        .auth-link:hover { text-decoration: underline; }

        @media (max-width: 768px) {
          .auth-page { flex-direction: column; }
          .auth-left { padding: var(--space-8); min-height: auto; }
          .auth-right { width: 100%; padding: var(--space-8) var(--space-6); }
        }
      `}</style>
    </div>
  )
}
