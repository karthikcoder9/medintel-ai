import React, { useState } from 'react'
import { AlertTriangle, Plus, X, Search, CheckCircle, Loader } from 'lucide-react'
import { interactionService, medicineService } from '@/services/api'
import type { InteractionCheckResult, DrugInteraction, Medicine } from '@/types'
import toast from 'react-hot-toast'

export default function InteractionsPageImpl() {
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Medicine[]>([])
  const [selectedMedicines, setSelectedMedicines] = useState<Medicine[]>([])
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<InteractionCheckResult | null>(null)
  const [searching, setSearching] = useState(false)

  const handleSearch = async (q: string) => {
    setSearchQ(q)
    if (q.length < 2) { setSearchResults([]); return }
    setSearching(true)
    const res = await medicineService.search(q)
    setSearchResults((res.data ?? []).filter(m => !selectedMedicines.find(s => s.id === m.id)))
    setSearching(false)
  }

  const addMedicine = (m: Medicine) => {
    if (selectedMedicines.find(s => s.id === m.id)) return
    setSelectedMedicines(prev => [...prev, m])
    setSearchResults([])
    setSearchQ('')
    setResult(null)
  }

  const removeMedicine = (id: string) => {
    setSelectedMedicines(prev => prev.filter(m => m.id !== id))
    setResult(null)
  }

  const checkInteractions = async () => {
    if (selectedMedicines.length < 2) { toast.error('Add at least 2 medicines to check'); return }
    setChecking(true)
    try {
      const res = await interactionService.check(selectedMedicines.map(m => m.id))
      if (res.success && res.data) setResult(res.data)
    } catch { toast.error('Interaction check failed') }
    finally { setChecking(false) }
  }

  const severityConfig = {
    major:    { class: 'severity-major',    label: 'Major',    icon: '🚨', desc: 'Seek medical advice immediately' },
    moderate: { class: 'severity-moderate', label: 'Moderate', icon: '⚠️', desc: 'Consult your pharmacist' },
    minor:    { class: 'severity-minor',    label: 'Minor',    icon: 'ℹ️', desc: 'Monitor for symptoms' },
    none:     { class: 'severity-none',     label: 'No Interaction', icon: '✅', desc: 'Safe combination' },
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Drug Interaction Checker</h1>
        <p className="page-subtitle">Add your medicines to check for potentially dangerous interactions powered by AI clinical analysis.</p>
      </div>

      <div className="int-layout">
        <div className="int-input-panel card">
          <h3 style={{ marginBottom: 'var(--space-4)' }}>Add Medicines to Check</h3>

          <div className="input-wrapper" style={{ marginBottom: 'var(--space-3)' }}>
            <Search className="input-icon" size={18} />
            <input
              className="input"
              placeholder="Search medicine name..."
              value={searchQ}
              onChange={(e) => handleSearch(e.target.value)}
              id="interaction-search-input"
            />
          </div>

          {searching && <div style={{ textAlign: 'center', padding: 'var(--space-3)' }}><Loader size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary)' }} /></div>}

          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.slice(0, 6).map(m => (
                <button key={m.id} className="search-dropdown-item" onClick={() => addMedicine(m)}>
                  <Plus size={16} color="var(--color-accent)" />
                  <div>
                    <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.generic_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 'var(--space-4)' }}>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>
              Selected Medicines ({selectedMedicines.length})
            </div>
            {selectedMedicines.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                Search and add at least 2 medicines above
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {selectedMedicines.map(m => (
                <div key={m.id} className="selected-med-item">
                  <div>
                    <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>{m.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{m.generic_name}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => removeMedicine(m.id)} aria-label="Remove"><X size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={checkInteractions}
            disabled={selectedMedicines.length < 2 || checking}
            id="check-interactions-btn"
            style={{ marginTop: 'var(--space-6)' }}
          >
            {checking
              ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
              : <><AlertTriangle size={18} /> Check Interactions</>}
          </button>
        </div>

        <div className="int-result-panel">
          {!result && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
              <AlertTriangle size={48} color="var(--text-muted)" style={{ margin: '0 auto var(--space-4)' }} />
              <h3 style={{ color: 'var(--text-secondary)' }}>Results will appear here</h3>
              <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>Add at least 2 medicines and click "Check Interactions"</p>
            </div>
          )}

          {result && (
            <div className="animate-scale-in">
              {result.has_major && (
                <div className="alert-major">
                  <span style={{ fontSize: 24 }}>🚨</span>
                  <div>
                    <strong>Major Interaction Detected!</strong>
                    <p style={{ marginTop: 4, fontSize: 'var(--text-sm)' }}>
                      One or more major drug interactions were found. Please contact your doctor or pharmacist immediately.
                    </p>
                  </div>
                </div>
              )}

              {!result.has_major && result.interactions.length === 0 && (
                <div className="alert-safe">
                  <CheckCircle size={24} color="var(--color-accent)" />
                  <div>
                    <strong style={{ color: 'var(--color-accent-light)' }}>No Known Interactions Found</strong>
                    <p style={{ marginTop: 4, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      These medicines appear safe to take together. Always confirm with your pharmacist.
                    </p>
                  </div>
                </div>
              )}

              {result.summary && (
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base)' }}>📋 AI Summary</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-md)', lineHeight: 1.7 }}>{result.summary}</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {result.interactions.map((interaction: DrugInteraction, i) => {
                  const sev = severityConfig[interaction.severity] ?? severityConfig.none
                  return (
                    <div key={i} className={`interaction-card int-${interaction.severity}`}>
                      <div className="interaction-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: 20 }}>{sev.icon}</span>
                          <div>
                            <div style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--text-primary)' }}>
                              {interaction.drug_1} ↔ {interaction.drug_2}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${sev.class}`}>{sev.label}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', margin: 'var(--space-3) 0', fontSize: 'var(--text-base)' }}>{interaction.description}</p>
                      {interaction.clinical_effect && <div className="int-detail"><strong>Effect:</strong> {interaction.clinical_effect}</div>}
                      {interaction.management && <div className="int-detail" style={{ marginTop: 'var(--space-2)' }}><strong>What to do:</strong> {interaction.management}</div>}
                    </div>
                  )
                })}
              </div>

              <div className="disclaimer-banner" style={{ marginTop: 'var(--space-6)' }}>
                <span>⚠️</span>
                <span>This analysis is AI-generated from pharmacological data. Always consult a licensed pharmacist or doctor before making any medication decisions.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .int-layout { display: grid; grid-template-columns: 360px 1fr; gap: var(--space-6); align-items: start; }
        .search-dropdown { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: var(--space-3); }
        .search-dropdown-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); cursor: pointer; width: 100%; text-align: left; border-bottom: 1px solid var(--border-subtle); background: none; transition: background var(--transition-fast); }
        .search-dropdown-item:hover { background: var(--bg-overlay); }
        .search-dropdown-item:last-child { border-bottom: none; }
        .selected-med-item { display: flex; align-items: center; justify-content: space-between; padding: var(--space-3) var(--space-4); background: var(--bg-elevated); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); }

        .alert-major { display: flex; align-items: flex-start; gap: var(--space-3); background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-4); color: var(--text-danger); }
        .alert-safe { display: flex; align-items: flex-start; gap: var(--space-3); background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); border-radius: var(--radius-lg); padding: var(--space-5); margin-bottom: var(--space-4); }

        .interaction-card { background: var(--bg-card); border-radius: var(--radius-xl); padding: var(--space-5); border: 1px solid var(--border-subtle); }
        .int-major    { border-color: rgba(239,68,68,0.3);  background: rgba(239,68,68,0.04); }
        .int-moderate { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.04); }
        .int-minor    { border-color: rgba(59,130,246,0.3); background: rgba(59,130,246,0.04); }
        .int-none     { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.04); }
        .interaction-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-2); }
        .int-detail { font-size: var(--text-sm); color: var(--text-secondary); line-height: 1.6; }
        .int-detail strong { color: var(--text-primary); }

        @media (max-width: 768px) { .int-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  )
}
