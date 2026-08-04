import React, { useState, useCallback } from 'react'
import { Camera, Upload, CheckCircle, AlertCircle, Loader, Info, RefreshCw, Zap } from 'lucide-react'
import { scanService, medicineService } from '@/services/api'
import { useTranslation } from '@/i18n/i18nContext'
import type { ScanResult, Medicine } from '@/types'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

type ScanState = 'idle' | 'scanning' | 'result' | 'error'

export default function ScanPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [state, setState] = useState<ScanState>('idle')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [medicine, setMedicine] = useState<Medicine | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    setState('scanning')
    try {
      const res = await scanService.scanImage(file)
      if (res.success && res.data) {
        setScanResult(res.data)
        if (res.data.matched_medicine_id) {
          const mRes = await medicineService.getById(res.data.matched_medicine_id)
          if (mRes.success) setMedicine(mRes.data)
        }
        setState('result')
      } else { setState('error') }
    } catch { setState('error'); toast.error('Scan failed. Please try with a clearer image.') }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [])

  const confidenceColor = (c?: string) =>
    c === 'high' ? 'badge-success' : c === 'medium' ? 'badge-warning' : 'badge-danger'

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">{t('scanPillPrescription', 'Scan Medicine / Prescription')}</h1>
        <p className="page-subtitle">{t('scanDesc', 'Take a photo of any medicine strip or bottle. AI will identify and explain it instantly.')}</p>
      </div>

      {state === 'idle' && (
        <div className="scan-layout">
          <div
            className={`scan-upload-zone card-hover-effect glass-panel ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            aria-label="Upload medicine image"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} />
            <div className="scan-upload-icon pulse-ring"><Camera size={36} /></div>
            <h3 style={{ fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              {t('uploadImage', 'Drop your medicine photo here')}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
              Supports: JPG, PNG, WebP • Max 10MB
            </p>
            <button className="btn btn-primary btn-lg btn-shimmer" id="scan-upload-btn" onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
              <Upload size={20} /> {t('uploadImage', 'Choose Image')}
            </button>
          </div>

          <div className="scan-tips card glass-panel">
            <h3 style={{ marginBottom: 'var(--space-4)' }}>📸 Tips for Best Results</h3>
            {[
              'Place medicine on a flat surface with good lighting',
              'Make sure text on the label is clearly visible',
              'Avoid shadows and reflections on the packaging',
              'Capture the front label with the drug name',
            ].map((tip, i) => (
              <div key={i} className="tip-item">
                <CheckCircle size={16} color="var(--color-accent)" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state === 'scanning' && (
        <div className="scan-loading card glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="scanner-laser-line" />
          {preview && <img src={preview} alt="Scanning" className="scan-preview" />}
          <div className="scan-loading-content">
            <div className="scan-spinner">
              <Loader size={44} color="var(--color-primary-light)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <h3 style={{ color: 'var(--color-primary-light)' }}>{t('scanningLaser', 'AI Optical Scanner Active')}</h3>
            <p style={{ color: 'var(--text-secondary)' }}>{t('analyzingPill', 'Analyzing medicine label with DeepSeek AI...')}</p>
          </div>
        </div>
      )}

      {state === 'result' && scanResult && (
        <div className="scan-result animate-scale-in">
          <div className="scan-result-header">
            <div className="scan-success-badge">
              <CheckCircle size={20} color="var(--color-accent)" />
              <span>Medicine Identified</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { setState('idle'); setScanResult(null); setMedicine(null); setPreview(null) }}>
              <RefreshCw size={16} /> Scan Again
            </button>
          </div>

          <div className="scan-result-grid">
            {preview && <img src={preview} alt="Scanned medicine" className="scan-result-image" />}
            <div className="scan-result-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 'var(--text-2xl)', fontFamily: 'var(--font-display)' }}>
                  {scanResult.medicine_name && scanResult.medicine_name !== 'NOT_FOUND' 
                    ? scanResult.medicine_name 
                    : scanResult.generic_name && scanResult.generic_name !== 'NOT_FOUND' 
                    ? scanResult.generic_name 
                    : 'Medicine Packaging'}
                </h2>
                <span className={`badge ${confidenceColor(scanResult.confidence)}`}>
                  {scanResult.confidence} confidence
                </span>
              </div>
              {scanResult.generic_name && scanResult.generic_name !== 'NOT_FOUND' && (
                <p style={{ color: 'var(--color-primary-light)', fontSize: 'var(--text-md)', marginBottom: 'var(--space-4)' }}>
                  Generic Name: <strong>{scanResult.generic_name}</strong>
                </p>
              )}

              <div className="scan-info-grid">
                {scanResult.dosage_strength && <div className="scan-info-item"><span className="scan-info-label">Strength</span><span className="scan-info-value">{scanResult.dosage_strength}</span></div>}
                {scanResult.dosage_form && <div className="scan-info-item"><span className="scan-info-label">Form</span><span className="scan-info-value">{scanResult.dosage_form}</span></div>}
                {scanResult.manufacturer && <div className="scan-info-item"><span className="scan-info-label">Manufacturer</span><span className="scan-info-value">{scanResult.manufacturer}</span></div>}
                {scanResult.expiry_date && <div className="scan-info-item"><span className="scan-info-label">Expiry</span><span className="scan-info-value" style={{ color: 'var(--text-warning)' }}>{scanResult.expiry_date}</span></div>}
              </div>

              {scanResult.instructions && (
                <div className="disclaimer-banner" style={{ marginTop: 'var(--space-4)' }}>
                  <Info size={16} /><span>{scanResult.instructions}</span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
                {scanResult.matched_medicine_id && (
                  <button className="btn btn-primary" onClick={() => navigate(`/medicines/${scanResult.matched_medicine_id}`)} id="scan-view-detail-btn">
                    View Full Details
                  </button>
                )}
                <button
                  className="btn btn-ghost"
                  onClick={() => navigate('/chat', { state: { initialMessage: `What is ${scanResult.medicine_name || scanResult.matched_medicine_name || 'this medicine'} used for and what are its precautions?` } })}
                  id="scan-ask-ai-btn"
                >
                  Ask AI About This
                </button>
              </div>
            </div>
          </div>

          {medicine?.simple_explanation && (
            <div className="card" style={{ marginTop: 'var(--space-6)', borderColor: 'var(--border-primary)', background: 'rgba(59,130,246,0.04)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-primary-light)' }}>🤖 AI Plain Language Explanation</h3>
              <p style={{ fontSize: 'var(--text-md)', lineHeight: 1.8, color: 'var(--text-primary)' }}>{medicine.simple_explanation}</p>
            </div>
          )}

          <div className="disclaimer-banner" style={{ marginTop: 'var(--space-6)' }}>
            <span>⚠️</span>
            <span>This information is for educational purposes only. Always follow your doctor's or pharmacist's instructions.</span>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="scan-error card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
          <AlertCircle size={48} color="var(--color-danger)" style={{ margin: '0 auto var(--space-4)' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Scan Failed</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
            Could not extract medicine information. Please try with a clearer, well-lit image.
          </p>
          <button className="btn btn-primary" onClick={() => { setState('idle'); setPreview(null) }} id="scan-retry-btn">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      )}

      <style>{`
        .scan-layout { display: grid; grid-template-columns: 1fr 320px; gap: var(--space-6); }
        .tip-item { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) 0; border-bottom: 1px solid var(--border-subtle); font-size: var(--text-base); color: var(--text-secondary); }
        .tip-item:last-child { border-bottom: none; }

        .scan-loading { display: flex; gap: var(--space-8); align-items: center; padding: var(--space-8); }
        .scan-preview { width: 200px; height: 200px; object-fit: cover; border-radius: var(--radius-xl); border: 2px solid var(--border-primary); }
        .scan-loading-content { text-align: center; }
        .scan-spinner { margin-bottom: var(--space-4); }
        .scan-loading-content h3 { font-size: var(--text-xl); color: var(--text-primary); margin-bottom: var(--space-2); }

        .scan-result-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); }
        .scan-success-badge { display: flex; align-items: center; gap: var(--space-2); font-weight: var(--fw-semibold); color: var(--color-accent-light); font-size: var(--text-md); }

        .scan-result-grid { display: grid; grid-template-columns: 260px 1fr; gap: var(--space-6); }
        .scan-result-image { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-xl); border: 2px solid var(--border-default); }

        .scan-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
        .scan-info-item { background: var(--bg-elevated); border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4); border: 1px solid var(--border-subtle); }
        .scan-info-label { font-size: var(--text-xs); color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
        .scan-info-value { font-size: var(--text-base); font-weight: var(--fw-semibold); color: var(--text-primary); }

        @media (max-width: 768px) {
          .scan-layout { grid-template-columns: 1fr; }
          .scan-result-grid { grid-template-columns: 1fr; }
          .scan-loading { flex-direction: column; }
        }
      `}</style>
    </div>
  )
}
