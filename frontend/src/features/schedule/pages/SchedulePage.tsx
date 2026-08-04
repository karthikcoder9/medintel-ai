import React, { useState } from 'react'
import { Clock, Plus, CheckCircle, X, Loader, CalendarDays } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scheduleService, medicineService } from '@/services/api'
import type { MedicationSchedule, AdherenceStats, Medicine } from '@/types'
import toast from 'react-hot-toast'

export default function SchedulePage() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [medSearch, setMedSearch] = useState('')
  const [medResults, setMedResults] = useState<Medicine[]>([])
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null)
  const [form, setForm] = useState({
    dose_amount: '1',
    dose_unit: 'tablet',
    frequency: 'once_daily',
    time_input: '08:00',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    instructions: '',
    prescribed_by: '',
    reason: ''
  })

  const { data: schedules, isLoading } = useQuery({ queryKey: ['schedules'], queryFn: () => scheduleService.getAll(), select: r => r.data ?? [] as MedicationSchedule[] })
  const { data: adherence } = useQuery({ queryKey: ['adherence30'], queryFn: () => scheduleService.getAdherence(30), select: r => r.data as AdherenceStats })

  const createMutation = useMutation({
    mutationFn: () => scheduleService.create({
      medicine_id: selectedMed!.id,
      dose_amount: Number(form.dose_amount),
      dose_unit: form.dose_unit,
      frequency: form.frequency as any,
      times_of_day: [form.time_input || '08:00'],
      instructions: form.instructions || undefined,
      prescribed_by: form.prescribed_by || undefined,
      reason: form.reason || undefined,
      start_date: new Date(form.start_date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
    }),
    onSuccess: () => { toast.success('Schedule created!'); qc.invalidateQueries({ queryKey: ['schedules'] }); setShowAdd(false); setSelectedMed(null) },
    onError: () => toast.error('Failed to create schedule'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => scheduleService.deactivate(id),
    onSuccess: () => { toast.success('Schedule removed'); qc.invalidateQueries({ queryKey: ['schedules'] }) },
  })

  const markDoseMutation = useMutation({
    mutationFn: (scheduleId: string) => scheduleService.markDose({ schedule_id: scheduleId, status: 'taken' }),
    onSuccess: () => {
      toast.success('Dose marked as taken!')
      qc.invalidateQueries({ queryKey: ['adherence30'] })
      qc.invalidateQueries({ queryKey: ['schedules'] })
    },
    onError: () => toast.error('Failed to mark dose as taken'),
  })

  const freqLabel: Record<string, string> = {
    once_daily: 'Once Daily', twice_daily: 'Twice Daily', three_times_daily: '3× Daily',
    four_times_daily: '4× Daily', weekly: 'Weekly', as_needed: 'As Needed',
  }

  React.useEffect(() => {
    if (showAdd) {
      medicineService.search('').then(res => {
        setMedResults(res.data ?? [])
      }).catch(() => {})
    }
  }, [showAdd])

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Medication Schedule</h1>
          <p className="page-subtitle">Manage your daily medication routine and track adherence.</p>
        </div>
        <button className="btn btn-primary btn-shimmer" onClick={() => setShowAdd(true)} id="add-schedule-btn">
          <Plus size={18} /> Add Medicine
        </button>
      </div>

      {/* Adherence bar */}
      {adherence && (
        <div className="card glass-panel" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 4 }}>30-Day Adherence</div>
            <div style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--fw-extrabold)', fontFamily: 'var(--font-display)', color: adherence.adherence_percentage >= 80 ? 'var(--color-accent)' : 'var(--color-warning)' }}>
              {adherence.adherence_percentage}%
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 99, height: 12, overflow: 'hidden' }}>
              <div style={{ width: `${adherence.adherence_percentage}%`, height: '100%', borderRadius: 99, background: adherence.adherence_percentage >= 80 ? 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))' : 'linear-gradient(90deg, var(--color-warning), var(--color-warning-light))', transition: 'width 1s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              <span>✅ {adherence.taken} Taken</span>
              <span>❌ {adherence.missed} Missed</span>
              <span>⏭️ {adherence.skipped} Skipped</span>
            </div>
          </div>
        </div>
      )}

      {isLoading && <div style={{ textAlign: 'center', padding: 'var(--space-12)' }}><Loader size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} /></div>}

      {!isLoading && (schedules ?? []).length === 0 && (
        <div className="card glass-panel" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <CalendarDays size={48} color="var(--color-primary-light)" style={{ margin: '0 auto var(--space-4)' }} />
          <h3 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)' }}>No schedules yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Add your first medication routine to track daily doses.</p>
          <button className="btn btn-primary btn-lg btn-shimmer" style={{ marginTop: 'var(--space-4)' }} onClick={() => setShowAdd(true)}>
            <Plus size={18} /> Add First Medicine
          </button>
        </div>
      )}

      <div className="sched-grid">
        {(schedules ?? []).map(s => (
          <div key={s.id} className="card sched-card glass-panel card-hover-effect">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{s.medicine_name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginTop: 4 }}>
                  {s.dose_amount} {s.dose_unit} • {freqLabel[s.frequency] ?? s.frequency}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm btn-icon" onClick={() => deactivateMutation.mutate(s.id)} aria-label="Remove schedule">
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
              {s.times_of_day.map(t => (
                <span key={t} className="time-chip">
                  <Clock size={12} /> {t}
                </span>
              ))}
              {s.with_food !== null && s.with_food !== undefined && (
                <span className="badge badge-neutral">{s.with_food ? '🍽️ With food' : '💧 Without food'}</span>
              )}
            </div>
            {s.instructions && <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{s.instructions}</p>}
            {s.is_completed_today ? (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 'var(--space-4)', background: 'rgba(82, 183, 136, 0.15)', color: 'var(--color-primary-light)', border: '1px solid var(--color-primary-light)' }}
                onClick={() => toast.success('Daily dose for this medication is completed for today!')}
                id={`mark-taken-${s.id}`}
              >
                <CheckCircle size={16} /> Daily Dose Completed
              </button>
            ) : (
              <button
                className="btn btn-accent btn-sm"
                style={{ marginTop: 'var(--space-4)' }}
                onClick={() => markDoseMutation.mutate(s.id)}
                disabled={markDoseMutation.isPending}
                id={`mark-taken-${s.id}`}
              >
                <CheckCircle size={16} /> {markDoseMutation.isPending ? 'Saving...' : "Mark Today's Dose Taken"}
              </button>
            )}
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal glass-panel" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
              <h2 className="modal-title" style={{ margin: 0, color: 'var(--text-primary)' }}>Add Medication Schedule</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>

            {!selectedMed ? (
              <div>
                <div className="input-group">
                  <label className="input-label" style={{ color: 'var(--text-secondary)' }}>Select or Search Medicine</label>
                  <input className="input" placeholder="Type medicine name (e.g. Paracetamol, Dolo 650, Metformin)..." value={medSearch}
                    onChange={async (e) => {
                      const val = e.target.value
                      setMedSearch(val)
                      const res = await medicineService.search(val)
                      setMedResults(res.data ?? [])
                    }} />
                </div>

                {/* Custom entry button if user typed something custom */}
                {medSearch.trim().length > 0 && (
                  <button
                    className="btn btn-ghost btn-full"
                    onClick={() => {
                      setSelectedMed({
                        id: medSearch.trim(),
                        name: medSearch.trim(),
                        generic_name: medSearch.trim(),
                        dosage_forms: ['tablet'],
                        strengths: ['500mg'],
                        description: '',
                        side_effects: {},
                        food_interactions: [],
                        is_otc: true,
                        data_source: 'user'
                      })
                      setMedResults([])
                    }}
                    style={{
                      marginTop: 'var(--space-3)',
                      marginBottom: 'var(--space-3)',
                      justify: 'flex-start',
                      background: 'rgba(82, 183, 136, 0.15)',
                      color: 'var(--color-primary-light)',
                      border: '1px dashed var(--color-primary-light)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <Plus size={16} /> Use "{medSearch.trim()}" as custom medicine
                  </button>
                )}

                {medResults.length > 0 && (
                  <div className="search-dropdown glass-panel" style={{ marginTop: 'var(--space-2)', maxHeight: 220, overflowY: 'auto' }}>
                    {medResults.map(m => (
                      <button key={m.id} className="search-dropdown-item" onClick={() => { setSelectedMed(m); setMedResults([]) }}>
                        <Plus size={16} color="var(--color-primary-light)" />
                        <div>
                          <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{m.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.generic_name} • {m.drug_class}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="selected-med-item" style={{ marginBottom: 'var(--space-5)', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
                  <div><div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--color-primary-light)' }}>{selectedMed.name}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{selectedMed.generic_name}</div></div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setSelectedMed(null)}><X size={14} /></button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  <div className="input-group">
                    <label className="input-label">Dose Amount</label>
                    <input className="input" type="number" placeholder="e.g. 1" value={form.dose_amount} onChange={e => setForm(f => ({ ...f, dose_amount: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Unit</label>
                    <select className="input" value={form.dose_unit} onChange={e => setForm(f => ({ ...f, dose_unit: e.target.value }))}>
                      {['tablet', 'capsule', 'ml', 'mg', 'drop', 'puff', 'injection'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Frequency</label>
                    <select className="input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                      {Object.entries(freqLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} color="var(--color-primary-light)" /> Dose Time (Clock)
                    </label>
                    <input
                      className="input"
                      type="time"
                      value={form.time_input}
                      onChange={e => setForm(f => ({ ...f, time_input: e.target.value }))}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Start Date</label>
                    <input className="input" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">End Date (optional)</label>
                    <input className="input" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                  </div>
                  <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="input-label">Instructions (optional)</label>
                    <input className="input" placeholder="e.g. Take after meals" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
                  </div>
                </div>
                <button className="btn btn-primary btn-full btn-lg" style={{ marginTop: 'var(--space-6)' }}
                  onClick={() => createMutation.mutate()} disabled={!form.dose_amount || createMutation.isPending}
                  id="create-schedule-confirm-btn">
                  {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .sched-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-5); }
        .sched-card { transition: all var(--transition-base); }
        .sched-card:hover { border-color: var(--border-primary); box-shadow: var(--shadow-glow-primary); }
        .time-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--color-primary-glow); color: var(--color-primary-light); border: 1px solid rgba(59,130,246,0.2); padding: 4px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: var(--fw-semibold); }
        .search-dropdown { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
        .search-dropdown-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); cursor: pointer; width: 100%; text-align: left; border-bottom: 1px solid var(--border-subtle); background: none; transition: background var(--transition-fast); }
        .search-dropdown-item:hover { background: var(--bg-overlay); }
        .selected-med-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); }
      `}</style>
    </div>
  )
}
