import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Pill, AlertTriangle, Info, MessageSquare, Loader } from 'lucide-react'
import { medicineService } from '@/services/api'
import type { Medicine } from '@/types'

export default function MedicineDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: medicine, isLoading } = useQuery({
    queryKey: ['medicine', id],
    queryFn: () => medicineService.getById(id!),
    select: r => r.data as Medicine,
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <Loader size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} />
    </div>
  )

  if (!medicine) return null

  return (
    <div className="page-container animate-fade-in">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 'var(--space-6)' }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="med-detail-header card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--border-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
          <div className="medicine-card-icon" style={{ width: 64, height: 64 }}><Pill size={28} /></div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginBottom: 4 }}>{medicine.name}</h1>
            <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{medicine.generic_name}</p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {medicine.drug_class && <span className="badge badge-primary">{medicine.drug_class}</span>}
              {medicine.is_otc && <span className="badge badge-success">Over the Counter</span>}
              {medicine.dosage_forms?.map(f => <span key={f} className="badge badge-neutral">{f}</span>)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/chat')} id="med-ask-ai-btn">
            <MessageSquare size={18} /> Ask AI About This
          </button>
        </div>
      </div>

      {medicine.simple_explanation && (
        <div className="card" style={{ marginBottom: 'var(--space-6)', borderColor: 'var(--border-primary)', background: 'rgba(59,130,246,0.04)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', color: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            🤖 Simple Explanation
          </h2>
          <p style={{ fontSize: 'var(--text-md)', lineHeight: 1.8, color: 'var(--text-primary)' }}>{medicine.simple_explanation}</p>
        </div>
      )}

      <div className="med-detail-grid">
        {medicine.indications && (
          <div className="card">
            <h3 style={{ color: 'var(--color-accent-light)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}><Info size={18} /> What It Treats</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{medicine.indications}</p>
          </div>
        )}
        {medicine.mechanism_of_action && (
          <div className="card">
            <h3 style={{ color: 'var(--color-primary-light)', marginBottom: 'var(--space-3)' }}>⚙️ How It Works</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{medicine.mechanism_of_action}</p>
          </div>
        )}
        {medicine.elderly_warnings && (
          <div className="card" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.04)' }}>
            <h3 style={{ color: 'var(--color-warning-light)', marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 8 }}>👴 Elderly Warnings</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{medicine.elderly_warnings}</p>
          </div>
        )}
        {medicine.precautions && (
          <div className="card">
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>⚠️ Precautions</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{medicine.precautions}</p>
          </div>
        )}
      </div>

      {/* Side Effects */}
      {medicine.side_effects && (
        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
          <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={18} color="var(--color-warning)" /> Side Effects</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            {['common', 'rare', 'serious'].map(type => (
              medicine.side_effects[type as keyof typeof medicine.side_effects]?.length > 0 && (
                <div key={type}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-semibold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)', color: type === 'serious' ? 'var(--text-danger)' : type === 'rare' ? 'var(--text-warning)' : 'var(--text-secondary)' }}>
                    {type} ({(medicine.side_effects as any)[type]?.length})
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    {(medicine.side_effects as any)[type]?.map((s: string, i: number) => (
                      <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0 }} />{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      <div className="disclaimer-banner" style={{ marginTop: 'var(--space-6)' }}>
        <span>⚠️</span>
        <span>Source: {medicine.data_source?.toUpperCase()}. This information is for educational purposes only. Always follow your healthcare provider's instructions.</span>
      </div>

      <style>{`.med-detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-5); } @media (max-width: 768px) { .med-detail-grid { grid-template-columns: 1fr; } }`}</style>
    </div>
  )
}
