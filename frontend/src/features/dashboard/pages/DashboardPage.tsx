import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Pill, Camera, MessageSquare, AlertTriangle, Clock,
  CheckCircle, TrendingUp, Activity, ChevronRight, Zap
} from 'lucide-react'
import { scheduleService, medicineService, interactionService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/i18nContext'
import type { AdherenceStats, MedicationSchedule } from '@/types'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, Tooltip
} from 'recharts'

export default function DashboardPage() {
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const markDoseMutation = useMutation({
    mutationFn: (scheduleId: string) => scheduleService.markDose({ schedule_id: scheduleId, status: 'taken' }),
    onSuccess: () => {
      toast.success('Dose marked as taken!')
      qc.invalidateQueries({ queryKey: ['adherence', 30] })
      qc.invalidateQueries({ queryKey: ['adherence30'] })
      qc.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: () => toast.error('Failed to mark dose as taken'),
  })

  const { data: adherenceData } = useQuery({
    queryKey: ['adherence', 30],
    queryFn: () => scheduleService.getAdherence(30),
    select: (res) => res.data as AdherenceStats,
  })

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => scheduleService.getAll(),
    select: (res) => (res.data ?? []) as MedicationSchedule[],
  })

  const { data: medicines } = useQuery({
    queryKey: ['myMedicines'],
    queryFn: () => medicineService.getMyMedicines(),
    select: (res) => res.data ?? [],
  })

  const adherence = adherenceData?.adherence_percentage ?? 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'

  const quickActions = [
    { icon: Camera, label: t('scanPillPrescription', 'Scan Medicine'), desc: t('scanDesc', 'Identify from photo'), path: '/scan', color: 'primary' },
    { icon: MessageSquare, label: t('aiChatAssistant', 'Ask AI'), desc: t('aiChatDesc', 'Chat with assistant'), path: '/chat', color: 'accent' },
    { icon: AlertTriangle, label: t('checkInteractions', 'Check Interactions'), desc: t('checkDesc', 'Safety analysis'), path: '/interactions', color: 'warning' },
    { icon: Clock, label: t('navSchedule', 'My Schedule'), desc: t('patientSubtitle', 'Manage doses'), path: '/schedule', color: 'primary' },
  ]

  const adherenceChartData = [
    { name: 'Week 1', value: Math.max(0, adherence - 8 + Math.random() * 12) },
    { name: 'Week 2', value: Math.max(0, adherence - 4 + Math.random() * 8) },
    { name: 'Week 3', value: Math.max(0, adherence - 2 + Math.random() * 6) },
    { name: 'This week', value: adherence },
  ]

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div className="dash-header">
        <div>
          <p className="dash-greeting">{greeting}, {firstName} 👋</p>
          <h1 className="page-title">Your Health Dashboard</h1>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/scan')} id="dash-scan-btn">
          <Camera size={20} /> Scan Medicine
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid-4 stagger-children" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-card animate-fade-in">
          <div className="stat-icon stat-icon-primary"><Pill size={24} /></div>
          <div>
            <div className="stat-value">{medicines?.length ?? 0}</div>
            <div className="stat-label">Active Medicines</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-icon stat-icon-accent"><TrendingUp size={24} /></div>
          <div>
            <div className="stat-value">{adherence}%</div>
            <div className="stat-label">Adherence (30d)</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-icon stat-icon-warning"><Clock size={24} /></div>
          <div>
            <div className="stat-value">{schedules?.length ?? 0}</div>
            <div className="stat-label">Active Schedules</div>
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-icon stat-icon-danger"><Activity size={24} /></div>
          <div>
            <div className="stat-value">{adherenceData?.missed ?? 0}</div>
            <div className="stat-label">Missed (30d)</div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dash-main-grid">
        {/* Left column */}
        <div className="dash-col-left">
          {/* Quick Actions */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Zap size={20} color="var(--color-warning)" /> Quick Actions
            </h3>
            <div className="quick-actions-grid">
              {quickActions.map((action) => (
                <button
                  key={action.path}
                  className="quick-action-card"
                  onClick={() => navigate(action.path)}
                  id={`dash-action-${action.path.slice(1)}`}
                >
                  <div className={`quick-action-icon qa-${action.color}`}>
                    <action.icon size={22} />
                  </div>
                  <div className="quick-action-label">{action.label}</div>
                  <div className="quick-action-desc">{action.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Today's Medicines */}
          <div className="card">
            <div className="section-row-header">
              <h3>Today's Medicines</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/schedule')}>
                View All <ChevronRight size={16} />
              </button>
            </div>
            {(schedules ?? []).length === 0 ? (
              <div className="empty-state">
                <Pill size={40} color="var(--text-muted)" />
                <p>No active schedules. Add your first medicine!</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/schedule')}>
                  Add Medicine
                </button>
              </div>
            ) : (
              <div className="today-list">
                {(schedules ?? []).slice(0, 4).map((s) => (
                  <div key={s.id} className="today-item">
                    <div className="today-item-icon"><Pill size={18} /></div>
                    <div className="today-item-info">
                      <div className="today-item-name">{s.medicine_name}</div>
                      <div className="today-item-dose">{s.dose_amount} {s.dose_unit} • {s.times_of_day.join(', ')}</div>
                    </div>
                    {s.is_completed_today ? (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ background: 'rgba(82, 183, 136, 0.15)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-light)' }}
                        onClick={() => toast.success('Daily dose for this medication is completed for today!')}
                      >
                        <CheckCircle size={16} /> Completed
                      </button>
                    ) : (
                      <button
                        className="btn btn-accent btn-sm"
                        onClick={() => markDoseMutation.mutate(s.id)}
                        disabled={markDoseMutation.isPending}
                      >
                        <CheckCircle size={16} /> {markDoseMutation.isPending ? 'Saving...' : 'Mark Taken'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="dash-col-right">
          {/* Adherence Chart */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Adherence Trend</h3>
            <div className="adherence-visual">
              <div className="adherence-ring">
                <svg viewBox="0 0 120 120" width="120" height="120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="50" fill="none"
                    stroke={adherence >= 80 ? 'var(--color-accent)' : adherence >= 60 ? 'var(--color-warning)' : 'var(--color-danger)'}
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - adherence / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 1s ease' }}
                  />
                  <text x="60" y="60" textAnchor="middle" dy="0.3em"
                    fill="var(--text-primary)" fontSize="22" fontWeight="700"
                    fontFamily="var(--font-display)">
                    {adherence}%
                  </text>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={adherenceChartData}>
                    <defs>
                      <linearGradient id="adGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }} />
                    <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#adGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="adherence-stats">
              <div className="adh-stat"><span className="adh-dot" style={{ background: 'var(--color-accent)' }}></span>{adherenceData?.taken ?? 0} Taken</div>
              <div className="adh-stat"><span className="adh-dot" style={{ background: 'var(--color-danger)' }}></span>{adherenceData?.missed ?? 0} Missed</div>
              <div className="adh-stat"><span className="adh-dot" style={{ background: 'var(--color-warning)' }}></span>{adherenceData?.skipped ?? 0} Skipped</div>
            </div>
          </div>

          {/* Safety Banner */}
          <div className="disclaimer-banner">
            <span style={{ fontSize: 20 }}>🛡️</span>
            <div>
              <strong style={{ color: 'var(--color-warning-light)', display: 'block', marginBottom: 4 }}>Medical Disclaimer</strong>
              MedIntel AI provides information only. It does not diagnose conditions or prescribe medicines.
              Always consult your doctor or pharmacist for medical advice.
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dash-header {
          display: flex; align-items: flex-end; justify-content: space-between;
          margin-bottom: var(--space-8);
        }
        .dash-greeting { font-size: var(--text-sm); color: var(--text-muted); margin-bottom: var(--space-1); }

        .dash-main-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: var(--space-6);
        }

        .quick-actions-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-3);
        }
        .quick-action-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          text-align: left;
          cursor: pointer;
          transition: all var(--transition-base);
        }
        .quick-action-card:hover {
          border-color: var(--border-primary);
          transform: translateY(-2px);
          box-shadow: var(--shadow-glow-primary);
        }
        .quick-action-icon {
          width: 44px; height: 44px; border-radius: var(--radius-md);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: var(--space-3);
        }
        .qa-primary { background: var(--color-primary-glow); color: var(--color-primary-light); }
        .qa-accent  { background: var(--color-accent-glow); color: var(--color-accent-light); }
        .qa-warning { background: rgba(245,158,11,0.15); color: var(--color-warning-light); }
        .quick-action-label { font-weight: var(--fw-semibold); font-size: var(--text-base); color: var(--text-primary); }
        .quick-action-desc { font-size: var(--text-xs); color: var(--text-muted); margin-top: 2px; }

        .section-row-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-4); }

        .today-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .today-item {
          display: flex; align-items: center; gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: var(--bg-elevated);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
        }
        .today-item-icon {
          width: 40px; height: 40px; border-radius: var(--radius-md);
          background: var(--color-primary-glow); color: var(--color-primary-light);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .today-item-info { flex: 1; }
        .today-item-name { font-weight: var(--fw-semibold); font-size: var(--text-base); color: var(--text-primary); }
        .today-item-dose { font-size: var(--text-sm); color: var(--text-muted); margin-top: 2px; }

        .empty-state {
          display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
          padding: var(--space-8); color: var(--text-muted); text-align: center;
        }

        .adherence-visual { display: flex; align-items: center; gap: var(--space-4); }
        .adherence-stats { display: flex; gap: var(--space-6); margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
        .adh-stat { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); color: var(--text-secondary); }
        .adh-dot { width: 8px; height: 8px; border-radius: 50%; }

        @media (max-width: 1024px) { .dash-main-grid { grid-template-columns: 1fr; } }
        @media (max-width: 768px) { .dash-header { flex-direction: column; align-items: flex-start; gap: var(--space-4); } }
      `}</style>
    </div>
  )
}
