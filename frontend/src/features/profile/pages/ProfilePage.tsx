import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileService } from '@/services/api'
import { useAuthStore } from '@/store/authStore'
import { User, Phone, Heart, AlertCircle, Save, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { PatientProfile } from '@/types'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [newAllergy, setNewAllergy] = useState('')
  const [newCondition, setNewCondition] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.get(),
    select: r => r.data as PatientProfile | null,
  })

  const [form, setForm] = useState<Partial<PatientProfile>>({})
  React.useEffect(() => { if (profile) setForm(profile) }, [profile])

  const saveMutation = useMutation({
    mutationFn: () => profileService.upsert(form),
    onSuccess: () => { toast.success('Profile saved!'); qc.invalidateQueries({ queryKey: ['profile'] }) },
    onError: () => toast.error('Save failed'),
  })

  const addItem = (type: 'known_allergies' | 'chronic_conditions', value: string) => {
    if (!value.trim()) return
    setForm(f => ({ ...f, [type]: [...(f[type] ?? []), value.trim()] }))
    if (type === 'known_allergies') setNewAllergy('')
    else setNewCondition('')
  }

  const removeItem = (type: 'known_allergies' | 'chronic_conditions', index: number) => {
    setForm(f => ({ ...f, [type]: (f[type] ?? []).filter((_, i) => i !== index) }))
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Health Profile</h1>
        <p className="page-subtitle">This information helps the AI personalize medication explanations for you.</p>
      </div>

      <div className="profile-grid">
        {/* Account Info */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}><User size={18} color="var(--color-primary-light)" /> Account Information</h3>
          <div className="profile-avatar-row">
            <div className="profile-avatar">{user?.full_name?.[0]?.toUpperCase()}</div>
            <div>
              <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-bold)', color: 'var(--text-primary)' }}>{user?.full_name}</div>
              <div style={{ color: 'var(--text-muted)' }}>{user?.email}</div>
              <span className="badge badge-primary" style={{ marginTop: 'var(--space-2)', display: 'inline-block' }}>{user?.role?.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Physical Info */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}><Heart size={18} color="var(--color-danger)" /> Physical Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Weight (kg)</label>
              <input className="input" type="number" placeholder="e.g. 65" value={form.weight_kg ?? ''} onChange={e => setForm(f => ({ ...f, weight_kg: Number(e.target.value) }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Height (cm)</label>
              <input className="input" type="number" placeholder="e.g. 165" value={form.height_cm ?? ''} onChange={e => setForm(f => ({ ...f, height_cm: Number(e.target.value) }))} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Blood Type</label>
              <select className="input" value={form.blood_type ?? ''} onChange={e => setForm(f => ({ ...f, blood_type: e.target.value }))}>
                <option value="">Select blood type</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Allergies */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}><AlertCircle size={18} color="var(--color-danger)" /> Known Allergies</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', minHeight: 40 }}>
            {(form.known_allergies ?? []).map((a, i) => (
              <span key={i} className="badge badge-danger" style={{ cursor: 'pointer' }} onClick={() => removeItem('known_allergies', i)}>
                {a} <X size={10} />
              </span>
            ))}
            {(form.known_allergies ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No allergies listed</span>}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input className="input" placeholder="Add allergy..." value={newAllergy}
              onChange={e => setNewAllergy(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem('known_allergies', newAllergy)} />
            <button className="btn btn-ghost btn-icon" onClick={() => addItem('known_allergies', newAllergy)}><Plus size={18} /></button>
          </div>
        </div>

        {/* Conditions */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 8 }}>🩺 Chronic Conditions</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', minHeight: 40 }}>
            {(form.chronic_conditions ?? []).map((c, i) => (
              <span key={i} className="badge badge-warning" style={{ cursor: 'pointer' }} onClick={() => removeItem('chronic_conditions', i)}>
                {c} <X size={10} />
              </span>
            ))}
            {(form.chronic_conditions ?? []).length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No conditions listed</span>}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <input className="input" placeholder="Add condition..." value={newCondition}
              onChange={e => setNewCondition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem('chronic_conditions', newCondition)} />
            <button className="btn btn-ghost btn-icon" onClick={() => addItem('chronic_conditions', newCondition)}><Plus size={18} /></button>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 8 }}><Phone size={18} color="var(--color-accent)" /> Emergency Contact</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" placeholder="Contact name" value={form.emergency_contact?.name ?? ''}
                onChange={e => setForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, name: e.target.value } }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input className="input" placeholder="+91 XXXXX XXXXX" value={form.emergency_contact?.phone ?? ''}
                onChange={e => setForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, phone: e.target.value } }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Relationship</label>
              <select className="input" value={form.emergency_contact?.relation ?? ''}
                onChange={e => setForm(f => ({ ...f, emergency_contact: { ...f.emergency_contact, relation: e.target.value } }))}>
                <option value="">Select relation</option>
                {['Son', 'Daughter', 'Spouse', 'Parent', 'Sibling', 'Friend', 'Caregiver', 'Doctor'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg" style={{ marginTop: 'var(--space-8)' }}
        onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} id="save-profile-btn">
        <Save size={18} /> {saveMutation.isPending ? 'Saving...' : 'Save Profile'}
      </button>

      <div className="disclaimer-banner" style={{ marginTop: 'var(--space-6)' }}>
        <span>🔒</span>
        <span>Your health data is encrypted and never shared with third parties. It is used only to personalize your AI experience.</span>
      </div>

      <style>{`.profile-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-6); } .profile-avatar-row { display: flex; align-items: center; gap: var(--space-4); } .profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); display: flex; align-items: center; justify-content: center; font-size: var(--text-2xl); font-weight: var(--fw-bold); color: white; flex-shrink: 0; } @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } .profile-grid .card:last-child { grid-column: unset; } }`}</style>
    </div>
  )
}
