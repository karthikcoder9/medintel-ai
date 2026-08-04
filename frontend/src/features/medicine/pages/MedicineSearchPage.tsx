// Medicine Search + Detail pages + Profile page stubs with full implementation
import React, { useState } from 'react'
import { Search, Pill, ChevronRight, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { medicineService } from '@/services/api'
import type { Medicine } from '@/types'
import toast from 'react-hot-toast'

export default function MedicineSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  React.useEffect(() => {
    setLoading(true)
    medicineService.search('').then(res => {
      setResults(res.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setSearched(true)
    try {
      const res = await medicineService.search(query)
      setResults(res.data ?? [])
    } catch { toast.error('Search failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Medicine Library</h1>
        <p className="page-subtitle">Search our verified database of thousands of medicines.</p>
      </div>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
        <div className="input-wrapper" style={{ flex: 1 }}>
          <Search className="input-icon" size={20} />
          <input className="input" placeholder="Search by brand name or generic name..." value={query}
            onChange={e => setQuery(e.target.value)} id="medicine-search-input" style={{ fontSize: 'var(--text-lg)', minHeight: 60 }} />
        </div>
        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="medicine-search-submit">
          {loading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : 'Search'}
        </button>
      </form>

      {!searched && (
        <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--text-muted)' }}>
          <Pill size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--text-muted)' }} />
          <p>Type a medicine name above to search</p>
        </div>
      )}

      {searched && results.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-10)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No medicines found for "<strong>{query}</strong>"</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>Try a different name or check the spelling</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {results.map(m => (
          <div key={m.id} className="medicine-card" onClick={() => navigate(`/medicines/${m.id}`)}>
            <div className="medicine-card-icon"><Pill size={22} /></div>
            <div style={{ flex: 1 }}>
              <div className="medicine-card-name">{m.name}</div>
              <div className="medicine-card-generic">{m.generic_name} • {m.drug_class}</div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                {m.description?.substring(0, 120)}...
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', flexWrap: 'wrap' }}>
                {m.dosage_forms?.slice(0, 3).map(f => <span key={f} className="badge badge-neutral">{f}</span>)}
                {m.is_otc && <span className="badge badge-success">OTC</span>}
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  )
}
