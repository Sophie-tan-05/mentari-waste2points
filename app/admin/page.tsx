'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import QRCode from 'qrcode'

const CATEGORY_LABELS: Record<string, { label: string; labelMs: string; icon: string }> = {
  PLASTIC:     { label: 'Plastic',     labelMs: 'Plastik',    icon: '🧴' },
  PAPER:       { label: 'Paper',       labelMs: 'Kertas',     icon: '📄' },
  GLASS_METAL: { label: 'Glass-Metal', labelMs: 'Kaca & Logam', icon: '🍶' },
}

interface AdminStats {
  scansToday: number
  scansWeek: number
  totalKg: number
  kgByCategory: Record<string, number>
}

interface ScanRow {
  id: string
  unit: string
  qrCode: string
  category: string
  weightKg: number
  pointsEarned: number
  photoUrl: string
  photoHash: string | null
  status: string
  createdAt: string
}

interface HouseholdRow {
  id: string
  qrCode: string
  unit: string
  points: number
  lastScanAt: string | null
}

interface Top5Row {
  unit: string
  qrCode: string
  scans: number
  kg: number
  points: number
}

interface DashboardData {
  stats: AdminStats
  top5: Top5Row[]
  scans: ScanRow[]
  households: HouseholdRow[]
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

function CategoryBar({ kgByCategory, lang }: { kgByCategory: Record<string, number>; lang: string }) {
  const categories = ['PLASTIC', 'PAPER', 'GLASS_METAL']
  const total = categories.reduce((s, c) => s + (kgByCategory[c] ?? 0), 0)
  if (total === 0) return <p className="text-brand-muted text-sm">{lang === 'ms' ? 'Tiada data lagi.' : 'No data yet.'}</p>

  return (
    <div className="space-y-3">
      {categories.map(cat => {
        const kg  = kgByCategory[cat] ?? 0
        const pct = total > 0 ? Math.round((kg / total) * 100) : 0
        const { label, labelMs, icon } = CATEGORY_LABELS[cat]
        return (
          <div key={cat}>
            <div className="flex items-center justify-between text-xs text-brand-muted mb-1">
              <span>{icon} {lang === 'ms' ? labelMs : label}</span>
              <span>{Math.round(kg * 100) / 100} kg ({pct}%)</span>
            </div>
            <div className="h-3 bg-brand-green-pale rounded-full overflow-hidden">
              <div className="h-full bg-brand-green rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function exportCSV(scans: ScanRow[]) {
  const header = ['ID', 'Unit', 'QR Code', 'Category', 'Weight (kg)', 'Points Earned', 'Status', 'Date']
  const rows   = scans.map(s => [
    s.id, s.unit, s.qrCode, s.category,
    s.weightKg, s.pointsEarned, s.status,
    new Date(s.createdAt).toISOString(),
  ])
  const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `waste2points-export-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── QR Codes section ─────────────────────────────────────────────────────────

function QRCodesSection({ households, lang }: { households: HouseholdRow[]; lang: string }) {
  const [dataUrls, setDataUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    async function generate() {
      const results: Record<string, string> = {}
      for (const h of households) {
        results[h.qrCode] = await QRCode.toDataURL(h.qrCode, { width: 200, margin: 2 })
      }
      if (!cancelled) setDataUrls(results)
    }
    if (households.length) generate()
    return () => { cancelled = true }
  }, [households])

  return (
    <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-brand-charcoal font-semibold text-base">
          {lang === 'ms' ? `Kod QR Isi Rumah (${households.length})` : `Household QR Codes (${households.length})`}
        </h2>
        <button
          onClick={() => window.print()}
          className="h-9 px-4 bg-brand-green text-white rounded-xl font-semibold text-sm"
        >
          🖨️ {lang === 'ms' ? 'Cetak' : 'Print'}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 print:grid-cols-5">
        {households.map(h => (
          <div key={h.qrCode} className="flex flex-col items-center gap-2 p-3 border border-brand-border rounded-xl">
            {dataUrls[h.qrCode] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrls[h.qrCode]} alt={h.qrCode} className="w-32 h-32" />
            ) : (
              <div className="w-32 h-32 bg-brand-green-pale rounded-lg animate-pulse" />
            )}
            <p className="text-brand-charcoal font-bold text-sm text-center">{h.unit}</p>
            <p className="text-brand-muted font-mono text-xs text-center">{h.qrCode}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Password gate ────────────────────────────────────────────────────────────

function LoginForm({ onLogin, lang }: { onLogin: (pw: string) => void; lang: string }) {
  const [pw,      setPw]      = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    setLoading(false)
    if (res.ok) {
      sessionStorage.setItem('adminPw', pw)
      onLogin(pw)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error')
    }
  }

  return (
    <main className="max-w-sm mx-auto px-4 py-16 space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-brand-charcoal text-2xl font-bold">
          {lang === 'ms' ? 'Panel Admin' : 'Admin Panel'}
        </h1>
        <p className="text-brand-muted text-sm mt-1">
          {lang === 'ms' ? 'Ketua Blok / Block Leader' : 'Block Leader / Ketua Blok'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-brand-border p-6 shadow-sm space-y-4">
        <label className="block">
          <span className="text-brand-charcoal text-sm font-semibold">
            {lang === 'ms' ? 'Kata Laluan' : 'Kata Laluan / Password'}
          </span>
          <input
            type="password"
            value={pw}
            onChange={e => setPw(e.target.value)}
            className="mt-1 block w-full h-14 border border-brand-border rounded-xl px-4 text-brand-charcoal text-base focus:outline-none focus:ring-2 focus:ring-brand-green"
            placeholder={lang === 'ms' ? 'Masukkan kata laluan' : 'Enter password'}
            autoFocus
          />
        </label>

        {error && (
          <div className="bg-brand-reject-bg border border-brand-reject rounded-xl px-4 py-3">
            <p className="text-brand-reject text-sm font-semibold">❌ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!pw || loading}
          className="w-full h-14 bg-brand-green text-white rounded-xl font-bold text-base disabled:bg-brand-green-light disabled:text-brand-muted"
        >
          {loading
            ? (lang === 'ms' ? 'Masuk…' : 'Logging in…')
            : (lang === 'ms' ? 'Log Masuk' : 'Log In / Masuk')}
        </button>
      </form>

      <div className="text-center">
        <Link href="/" className="text-brand-muted text-sm hover:text-brand-green">
          ← {lang === 'ms' ? 'Laman Utama' : 'Back to Home'}
        </Link>
      </div>
    </main>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────

const CAT_ICON: Record<string, string> = { PLASTIC: '🧴', PAPER: '📄', GLASS_METAL: '🍶' }
const CAT_EXPECT: Record<string, string> = {
  PLASTIC:     'Bottles, containers, packaging — scale display should match submitted kg',
  PAPER:       'Cardboard, newspapers, paper — check scale display matches submitted kg',
  GLASS_METAL: 'Glass bottles, tin cans, aluminium — check scale display matches submitted kg',
}
const CHECKLIST = [
  'Scale display is clearly visible in the photo',
  'Number on scale matches the submitted weight',
  'Items on scale match the selected category',
  'Photo is not blurry or obstructed',
]

function PhotoReviewModal({ scan, allScans, onClose, onReject, rejecting }: {
  scan: ScanRow
  allScans: ScanRow[]
  onClose: () => void
  onReject: () => void
  rejecting: boolean
}) {
  // Previous approved/pending photos from same household (excluding current)
  const prevPhotos = allScans
    .filter(s => s.qrCode === scan.qrCode && s.id !== scan.id && s.status !== 'rejected')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4)

  // Hash duplicate check
  const hashDuplicate = scan.photoHash
    ? allScans.find(s => s.id !== scan.id && s.photoHash === scan.photoHash && s.photoHash !== null)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          <div>
            <p className="font-bold text-brand-charcoal text-base">{scan.unit} — Photo Review</p>
            <p className="text-brand-muted text-xs mt-0.5">{formatDate(scan.createdAt)}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted text-2xl leading-none hover:text-brand-charcoal">×</button>
        </div>

        {/* Photo */}
        <div className="bg-black flex-1 overflow-hidden flex items-center justify-center min-h-[240px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={scan.photoUrl} alt="submission" className="max-h-[320px] w-full object-contain" />
        </div>

        {/* Submission details */}
        <div className="px-5 py-4 border-t border-brand-border bg-amber-50">
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-white rounded-xl p-3 border border-amber-200">
              <p className="text-amber-600 text-xs">Submitted weight</p>
              <p className="font-bold text-amber-900 text-lg">{scan.weightKg} kg</p>
              <p className="text-amber-600 text-[10px]">↑ Find this on the scale</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-amber-200">
              <p className="text-amber-600 text-xs">Category</p>
              <p className="font-bold text-amber-900 text-lg">{CAT_ICON[scan.category] ?? '♻️'}</p>
              <p className="text-amber-700 text-[10px]">{scan.category.replace('_',' ')}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-amber-200">
              <p className="text-amber-600 text-xs">Points claimed</p>
              <p className="font-bold text-amber-900 text-lg">+{scan.pointsEarned}</p>
              <p className="text-amber-600 text-[10px]">pts pending</p>
            </div>
          </div>

          {/* ── Duplicate hash warning ── */}
          {hashDuplicate && (
            <div className="bg-red-50 border-2 border-brand-reject rounded-xl px-4 py-3 mb-3">
              <p className="text-brand-reject font-bold text-xs">🚨 EXACT DUPLICATE PHOTO DETECTED</p>
              <p className="text-brand-reject text-xs mt-1">
                This exact photo file was previously submitted by <strong>{hashDuplicate.unit}</strong> on {formatDate(hashDuplicate.createdAt)}.
                Identical file hash — this is the same photo reused.
              </p>
            </div>
          )}

          {/* ── Previous photos from same household ── */}
          {prevPhotos.length > 0 && (
            <div className="mb-3">
              <p className="text-amber-800 text-xs font-bold mb-2">📷 Previous submissions from {scan.unit} — compare visually:</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {prevPhotos.map(prev => (
                  <div key={prev.id} className="shrink-0 text-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={prev.photoUrl}
                      alt=""
                      className={`w-20 h-20 rounded-lg object-cover border-2 ${prev.photoHash && prev.photoHash === scan.photoHash ? 'border-brand-reject' : 'border-amber-200'}`}
                    />
                    <p className="text-[10px] text-amber-600 mt-1">{prev.weightKg}kg</p>
                    <p className="text-[10px] text-amber-500">{new Date(prev.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What to check */}
          <p className="text-amber-800 text-xs font-bold mb-2">✔ Verify each point:</p>
          <ul className="space-y-1 mb-4">
            {CHECKLIST.map(item => (
              <li key={item} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="text-amber-400 mt-0.5">□</span> {item}
              </li>
            ))}
          </ul>
          <p className="text-amber-600 text-[11px] italic mb-4">
            {CAT_EXPECT[scan.category] ?? 'Check scale display matches submitted weight'}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-11 border-2 border-brand-green text-brand-green rounded-xl font-semibold text-sm"
            >
              ✅ Looks correct
            </button>
            <button
              onClick={onReject}
              disabled={rejecting}
              className="flex-1 h-11 bg-brand-reject text-white rounded-xl font-bold text-sm disabled:opacity-40"
            >
              {rejecting ? '…' : '✕ Reject this submission'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ApprovePanel({ password, lang, pendingScans, onApproved }: {
  password: string; lang: string; pendingScans: ScanRow[]; onApproved: () => void
}) {
  const [truckWeight, setTruckWeight] = useState('')
  const [weekLabel,   setWeekLabel]   = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [result,      setResult]      = useState<null | { scanCount: number; digitalWeightKg: number; truckWeightKg: number; scalingFactor: number; variancePct: number; householdsRewarded: number }>(null)
  // >25% investigation state
  const [rejected,      setRejected]      = useState<Set<string>>(new Set())
  const [rejectingId,   setRejectingId]   = useState<string | null>(null)
  const [viewedPhoto,   setViewedPhoto]   = useState<Set<string>>(new Set())
  const [reviewingScan, setReviewingScan] = useState<ScanRow | null>(null)

  const sorted     = [...pendingScans].sort((a, b) => b.weightKg - a.weightKg)
  const active     = sorted.filter(s => !rejected.has(s.id))
  const digitalKg  = Math.round(active.reduce((s, sc) => s + sc.weightKg, 0) * 100) / 100
  const truck      = parseFloat(truckWeight) || 0
  const variance   = truck > 0 ? Math.round(Math.abs((digitalKg - truck) / truck) * 1000) / 10 : null

  // Tier logic
  const tier = variance === null ? null : variance < 5 ? 'ok' : variance <= 25 ? 'scale' : 'investigate'
  const scalingFactor = (tier === 'scale' && truck > 0 && digitalKg > 0)
    ? Math.round((truck / digitalKg) * 1000) / 1000
    : 1

  async function handleRejectScan(scanId: string) {
    setRejectingId(scanId)
    const res = await fetch('/api/admin/reject', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, adminPassword: password }),
    })
    if ((await res.json()).success) setRejected(prev => new Set([...prev, scanId]))
    setRejectingId(null)
  }

  async function handleApprove() {
    if (!confirm('Release points to all residents?')) return
    setLoading(true); setError('')
    const res = await fetch('/api/admin/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, truckWeightKg: truck, weekLabel: weekLabel || 'Manual approval', scalingFactor }),
    })
    const d = await res.json()
    setLoading(false)
    if (d.success) { setResult(d); onApproved() }
    else setError(d.error ?? 'Error')
  }

  // ── Result screen ──────────────────────────────────────────────────────────
  if (result) {
    const scaled = result.scalingFactor < 1
    return (
      <div className="bg-brand-green-pale border-2 border-brand-green rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✅</span>
          <h3 className="font-bold text-brand-green text-base">Points Released!</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {([
            ['Scans approved',      result.scanCount],
            ['Households rewarded', result.householdsRewarded],
            ['Digital total',       `${result.digitalWeightKg} kg`],
            ['Truck receipt',       `${result.truckWeightKg} kg`],
          ] as [string, string|number][]).map(([label, val]) => (
            <div key={label} className="bg-white rounded-xl p-3 border border-brand-border">
              <p className="text-brand-muted text-xs">{label}</p>
              <p className="text-brand-charcoal font-bold">{val}</p>
            </div>
          ))}
        </div>
        {scaled && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 text-xs text-amber-800 font-semibold">
            ⚖️ Pro-rata applied: everyone's points × {result.scalingFactor} to match truck weight
          </div>
        )}
        <button onClick={() => setResult(null)} className="text-brand-muted text-xs underline">Dismiss</button>
      </div>
    )
  }

  // ── Input row (always shown) ───────────────────────────────────────────────
  const inputRow = (
    <div className="grid grid-cols-2 gap-3 px-5 pb-4">
      <div>
        <label className="text-amber-800 text-xs font-semibold block mb-1">Week / Batch label</label>
        <input type="text" value={weekLabel} onChange={e => setWeekLabel(e.target.value)}
          placeholder="e.g. Week 27 / Jul 2026"
          className="w-full h-11 px-3 rounded-xl border border-amber-300 text-sm bg-white focus:outline-none focus:border-amber-500" />
      </div>
      <div>
        <label className="text-amber-800 text-xs font-semibold block mb-1">Truck weight (kg) *</label>
        <input type="number" step="0.1" min="0.1" value={truckWeight} onChange={e => setTruckWeight(e.target.value)}
          placeholder="e.g. 85.5"
          className="w-full h-11 px-3 rounded-xl border border-amber-300 text-sm bg-white focus:outline-none focus:border-amber-500" />
      </div>
    </div>
  )

  // ── Panel header ──────────────────────────────────────────────────────────
  const panelHeader = (
    <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-200">
      <span className="text-2xl">⚖️</span>
      <div className="flex-1">
        <h3 className="font-bold text-amber-900 text-base">Approve Pending Submissions</h3>
        <p className="text-amber-700 text-xs mt-0.5">{pendingScans.length} submissions · Digital total: {digitalKg} kg</p>
      </div>
    </div>
  )

  // ── TIER: ok (<5%) ────────────────────────────────────────────────────────
  if (tier === 'ok') return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl overflow-hidden space-y-0">
      {panelHeader}
      <div className="px-5 py-4 bg-brand-green-pale border-b border-amber-200">
        <p className="text-brand-green font-bold text-sm">✅ Variance {variance}% — within normal scale tolerance</p>
        <p className="text-brand-muted text-xs mt-1">Points approved as submitted. No adjustment needed.</p>
      </div>
      {inputRow}
      {error && <p className="px-5 pb-2 text-brand-reject text-xs font-semibold">❌ {error}</p>}
      <div className="px-5 pb-5">
        <button onClick={handleApprove} disabled={loading || !truck}
          className="w-full h-12 bg-brand-green hover:bg-brand-green-mid text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors">
          {loading ? 'Processing…' : `✅ Approve ${active.length} submissions & Release Points`}
        </button>
      </div>
    </div>
  )

  // ── TIER: scale (5–25%) ───────────────────────────────────────────────────
  if (tier === 'scale') return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl overflow-hidden">
      {panelHeader}
      <div className="px-5 py-4 bg-amber-100 border-b border-amber-200 space-y-2">
        <p className="text-amber-900 font-bold text-sm">⚖️ Variance {variance}% — pro-rata scaling applied</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-white rounded-xl p-3 border border-amber-200 text-center">
            <p className="text-amber-600">Digital total</p>
            <p className="font-bold text-amber-900 text-base">{digitalKg} kg</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-amber-200 text-center">
            <p className="text-amber-600">Truck receipt</p>
            <p className="font-bold text-amber-900 text-base">{truck} kg</p>
          </div>
          <div className="bg-brand-green rounded-xl p-3 text-center">
            <p className="text-white/80">Scale factor</p>
            <p className="font-bold text-white text-base">× {scalingFactor}</p>
          </div>
        </div>
        <p className="text-amber-700 text-xs">Everyone's points × {scalingFactor} — no one is singled out, total points match truck weight exactly.</p>
      </div>
      {inputRow}
      {error && <p className="px-5 pb-2 text-brand-reject text-xs font-semibold">❌ {error}</p>}
      <div className="px-5 pb-5">
        <button onClick={handleApprove} disabled={loading || !truck}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors">
          {loading ? 'Processing…' : `✅ Scale & Approve ${active.length} submissions`}
        </button>
      </div>
    </div>
  )

  // ── TIER: investigate (>25%) ──────────────────────────────────────────────
  if (tier === 'investigate') return (
    <>
    {reviewingScan && (
      <PhotoReviewModal
        scan={reviewingScan}
        allScans={pendingScans}
        onClose={() => setReviewingScan(null)}
        rejecting={rejectingId === reviewingScan.id}
        onReject={async () => {
          await handleRejectScan(reviewingScan.id)
          setReviewingScan(null)
        }}
      />
    )}
    <div className="bg-amber-50 border-2 border-red-400 rounded-2xl overflow-hidden">
      {panelHeader}
      {/* Warning */}
      <div className="px-5 py-3 bg-red-50 border-b border-red-200">
        <p className="text-red-800 font-bold text-sm">🚨 Variance {variance}% — too high to auto-approve</p>
        <p className="text-red-700 text-xs mt-1">
          Click each photo to verify. If you confirm a submission is wrong, press Reject. Once variance drops below 25%, you can approve.
        </p>
      </div>
      {/* Sorted list */}
      <div className="divide-y divide-amber-100 max-h-[400px] overflow-y-auto">
        {sorted.filter(s => !rejected.has(s.id)).map((sc, i) => {
          const isHeaviest = i === 0
          const hasViewed  = viewedPhoto.has(sc.id)
          return (
            <div key={sc.id} className={`flex items-center gap-3 px-5 py-3 ${isHeaviest ? 'bg-red-50' : ''}`}>
              {/* Photo — must open review modal before reject unlocks */}
              <button
                onClick={() => { setReviewingScan(sc); setViewedPhoto(prev => new Set([...prev, sc.id])) }}
                className="shrink-0 relative"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sc.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover border-2 border-amber-200 hover:opacity-80" />
                {!hasViewed && <span className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg text-white text-[10px] font-bold">REVIEW</span>}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-amber-900 text-sm">{sc.unit}</span>
                  {isHeaviest && <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">⚠ Heaviest</span>}
                </div>
                <p className="text-amber-700 text-xs">{CAT_ICON[sc.category] ?? '♻️'} {sc.category.replace('_',' ')} · {sc.weightKg} kg</p>
              </div>
              <button
                onClick={() => handleRejectScan(sc.id)}
                disabled={!hasViewed || rejectingId === sc.id}
                title={!hasViewed ? 'Click photo first to verify before rejecting' : ''}
                className="shrink-0 text-xs px-3 py-1.5 bg-brand-reject text-white rounded-lg font-semibold disabled:opacity-30 hover:bg-red-800 transition-colors"
              >
                {rejectingId === sc.id ? '…' : '✕ Reject'}
              </button>
            </div>
          )
        })}
        {rejected.size > 0 && (
          <div className="px-5 py-2 bg-red-50 text-xs text-brand-reject font-semibold">
            {rejected.size} rejected — new digital total: {digitalKg} kg · Variance now: {variance}%
          </div>
        )}
      </div>
      {/* Once variance drops below 25%, show pro-rata approve */}
      {variance !== null && variance <= 25 && (
        <div className="p-5 border-t border-amber-200 space-y-3">
          <p className="text-brand-green font-bold text-sm">✅ Variance now {variance}% — ready to approve with pro-rata scaling (× {scalingFactor})</p>
          {inputRow}
          {error && <p className="text-brand-reject text-xs font-semibold">❌ {error}</p>}
          <button onClick={handleApprove} disabled={loading || !truck}
            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm disabled:opacity-40 transition-colors">
            {loading ? 'Processing…' : `✅ Scale & Approve ${active.length} submissions`}
          </button>
        </div>
      )}
      {(variance === null || variance > 25) && (
        <div className="px-5 py-4">
          {inputRow}
        </div>
      )}
    </div>
    </>
  )

  // ── Default: no truck weight entered yet ──────────────────────────────────
  return (
    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl overflow-hidden">
      {panelHeader}
      <div className="p-5 space-y-3">
        {inputRow}
        {error && <p className="text-brand-reject text-xs font-semibold">❌ {error}</p>}
        <button disabled className="w-full h-12 bg-amber-200 text-amber-500 font-bold rounded-xl text-sm cursor-not-allowed">
          Enter truck weight to continue
        </button>
      </div>
    </div>
  )
}

function Dashboard({ password, lang }: { password: string; lang: string }) {
  const [data,        setData]        = useState<DashboardData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [scanStatuses, setScanStatuses] = useState<Record<string, string>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      const d = await res.json()
      setData(d)
      const statusMap: Record<string, string> = {}
      for (const s of d.scans) statusMap[s.id] = s.status
      setScanStatuses(statusMap)
    }
    setLoading(false)
  }, [password])

  useEffect(() => { loadData() }, [loadData])

  async function handleReject(scanId: string) {
    const msg = lang === 'ms'
      ? 'Tolak imbasan ini dan balik mata?'
      : 'Reject this scan and reverse points?'
    if (!confirm(msg)) return

    setRejectingId(scanId)
    const res = await fetch('/api/admin/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId, adminPassword: password }),
    })
    const d = await res.json()
    if (d.success) {
      setScanStatuses(prev => ({ ...prev, [scanId]: 'rejected' }))
      setData(prev => {
        if (!prev) return prev
        return {
          ...prev,
          households: prev.households.map(h => {
            const scan = prev.scans.find(s => s.id === scanId)
            if (!scan || h.qrCode !== scan.qrCode) return h
            return { ...h, points: d.newHouseholdTotal }
          }),
        }
      })
    }
    setRejectingId(null)
  }

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-brand-muted">{lang === 'ms' ? 'Memuatkan…' : 'Loading dashboard…'}</p>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-brand-reject">{lang === 'ms' ? 'Gagal memuatkan data.' : 'Failed to load data.'}</p>
      </main>
    )
  }

  const { stats, top5, scans, households } = data

  const statCards = [
    { label: lang === 'ms' ? 'Imbasan Hari Ini' : 'Scans Today',     value: stats.scansToday,         icon: '📊' },
    { label: lang === 'ms' ? 'Imbasan Minggu'   : 'Scans This Week', value: stats.scansWeek,           icon: '📅' },
    { label: lang === 'ms' ? 'Jumlah kg'         : 'Total kg',        value: `${stats.totalKg} kg`,    icon: '⚖️' },
  ]

  const NAV = [
    { id: 'sec-stats',    icon: '📊', label: lang === 'ms' ? 'Statistik' : 'Stats' },
    { id: 'sec-category', icon: '⚖️', label: lang === 'ms' ? 'Kategori'  : 'By Category' },
    { id: 'sec-top5',     icon: '🏆', label: 'Top 5' },
    { id: 'sec-photos',   icon: '📸', label: lang === 'ms' ? 'Audit'     : 'Photo Audit' },
    { id: 'sec-qr',       icon: '🖨️', label: lang === 'ms' ? 'Kod QR'   : 'QR Codes' },
    { id: 'sec-households', icon: '🏠', label: lang === 'ms' ? 'Isi Rumah' : 'Households' },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-brand-charcoal text-xl font-bold">
            {lang === 'ms' ? 'Papan Pemuka Admin' : 'Admin Dashboard'}
          </h1>
          <p className="text-brand-muted text-sm">
            {lang === 'ms' ? 'Panel Ketua Blok · Mentari Damansara' : 'Block Leader Panel · Mentari Damansara'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => exportCSV(scans)}
            className="h-10 px-4 border-2 border-brand-green text-brand-green rounded-xl font-semibold text-sm"
          >
            📥 {lang === 'ms' ? 'Eksport CSV' : 'Export CSV'}
          </button>
          <button
            onClick={loadData}
            className="h-10 px-4 bg-brand-green text-white rounded-xl font-semibold text-sm"
          >
            ↻ {lang === 'ms' ? 'Muat Semula' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── Quick-nav bar ── */}
      <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-white/90 backdrop-blur border-b border-brand-border shadow-sm">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {NAV.map(n => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className="flex items-center gap-1 shrink-0 px-3 py-1.5 rounded-lg bg-brand-green-pale text-brand-green font-semibold text-xs hover:bg-brand-green hover:text-white transition-colors"
            >
              {n.icon} {n.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── 0. Pending approval panel ── */}
      {scans.some(s => s.status === 'pending') && (
        <ApprovePanel
          password={password}
          lang={lang}
          pendingScans={scans.filter(s => scanStatuses[s.id] === 'pending' || s.status === 'pending')}
          onApproved={loadData}
        />
      )}

      {/* ── 1. Stats cards ── */}
      <div id="sec-stats" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm flex sm:flex-col items-center sm:items-center gap-4 sm:gap-1 sm:text-center">
            <div className="text-2xl">{card.icon}</div>
            <div className="sm:text-center">
              <p className="text-brand-green text-2xl font-bold leading-none">{card.value}</p>
              <p className="text-brand-muted text-xs mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. Kg by category ── */}
      <div id="sec-category" className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal font-semibold text-base mb-4">
          {lang === 'ms' ? 'Kg mengikut Kategori' : 'Kg by Category'}
        </h2>
        <CategoryBar kgByCategory={stats.kgByCategory} lang={lang} />
      </div>

      {/* ── 3. Top 5 households ── */}
      <div id="sec-top5" className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal font-semibold text-base mb-4">
          {lang === 'ms' ? 'Top 5 Isi Rumah Paling Aktif' : 'Top 5 Most Active Households'}
        </h2>
        {top5.length === 0 ? (
          <p className="text-brand-muted text-sm">{lang === 'ms' ? 'Tiada data lagi.' : 'No scan data yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[320px]">
              <thead>
                <tr className="text-brand-muted text-xs border-b border-brand-border">
                  <th className="text-left py-2 pr-4">#</th>
                  <th className="text-left py-2 pr-4">{lang === 'ms' ? 'Unit' : 'Unit'}</th>
                  <th className="text-right py-2 pr-4">{lang === 'ms' ? 'Imbasan' : 'Scans'}</th>
                  <th className="text-right py-2 pr-4">Kg</th>
                  <th className="text-right py-2">{lang === 'ms' ? 'Mata' : 'Points'}</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((row, i) => (
                  <tr key={row.qrCode} className="border-b border-brand-border last:border-0">
                    <td className="py-2 pr-4 text-brand-muted">{i + 1}</td>
                    <td className="py-2 pr-4 font-semibold text-brand-charcoal">{row.unit}</td>
                    <td className="py-2 pr-4 text-right text-brand-charcoal">{row.scans}</td>
                    <td className="py-2 pr-4 text-right text-brand-muted">{Math.round(row.kg * 100) / 100}</td>
                    <td className="py-2 text-right text-brand-green font-semibold">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 4. Photo audit table ── */}
      <div id="sec-photos" className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal font-semibold text-base mb-4">
          {lang === 'ms'
            ? `Audit Gambar — Semua Hantar (${scans.length})`
            : `Photo Audit — All Submissions (${scans.length})`}
        </h2>
        {scans.length === 0 ? (
          <p className="text-brand-muted text-sm">{lang === 'ms' ? 'Tiada hantar lagi.' : 'No submissions yet.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-brand-muted text-xs border-b border-brand-border">
                  <th className="text-left py-2 pr-3">{lang === 'ms' ? 'Gambar' : 'Photo'}</th>
                  <th className="text-left py-2 pr-3">{lang === 'ms' ? 'Unit' : 'Unit'}</th>
                  <th className="text-left py-2 pr-3">{lang === 'ms' ? 'Kategori' : 'Category'}</th>
                  <th className="text-right py-2 pr-3">Kg</th>
                  <th className="text-right py-2 pr-3">{lang === 'ms' ? 'Mata' : 'Pts'}</th>
                  <th className="text-left py-2 pr-3">{lang === 'ms' ? 'Tarikh' : 'Date'}</th>
                  <th className="text-left py-2 pr-3">{lang === 'ms' ? 'Status' : 'Status'}</th>
                  <th className="text-left py-2">{lang === 'ms' ? 'Tindakan' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {scans.map(scan => {
                  const status   = scanStatuses[scan.id] ?? scan.status
                  const approved = status === 'approved'
                  const cat      = CATEGORY_LABELS[scan.category] ?? { icon: '♻️', label: scan.category, labelMs: scan.category }
                  return (
                    <tr key={scan.id} className="border-b border-brand-border last:border-0 align-middle">
                      <td className="py-2 pr-3">
                        <a href={scan.photoUrl} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={scan.photoUrl}
                            alt="scan"
                            className="w-12 h-12 object-cover rounded-lg border border-brand-border hover:opacity-80 transition-opacity"
                          />
                        </a>
                      </td>
                      <td className="py-2 pr-3 font-semibold text-brand-charcoal">{scan.unit}</td>
                      <td className="py-2 pr-3 text-brand-muted">
                        {cat.icon} {lang === 'ms' ? cat.labelMs : cat.label}
                      </td>
                      <td className="py-2 pr-3 text-right text-brand-charcoal">{scan.weightKg}</td>
                      <td className="py-2 pr-3 text-right text-brand-green font-semibold">+{scan.pointsEarned}</td>
                      <td className="py-2 pr-3 text-brand-muted text-xs">{formatDate(scan.createdAt)}</td>
                      <td className="py-2 pr-3">
                        {status === 'pending' ? (
                          <span className="text-xs text-amber-600 font-semibold">⏳ Pending</span>
                        ) : approved ? (
                          <span className="text-xs text-brand-green font-semibold">✅ {lang === 'ms' ? 'Lulus' : 'Approved'}</span>
                        ) : (
                          <span className="text-xs text-brand-reject font-semibold">❌ {lang === 'ms' ? 'Ditolak' : 'Rejected'}</span>
                        )}
                      </td>
                      <td className="py-2">
                        {approved && (
                          <button
                            onClick={() => handleReject(scan.id)}
                            disabled={rejectingId === scan.id}
                            className="text-xs px-3 py-1.5 bg-brand-reject text-white rounded-lg font-semibold disabled:opacity-50"
                          >
                            {rejectingId === scan.id ? '…' : (lang === 'ms' ? 'Tolak' : 'Reject')}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 5. QR Codes ── */}
      <div id="sec-qr"><QRCodesSection households={households} lang={lang} /></div>

      {/* ── 6. All households table ── */}
      <div id="sec-households" className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal font-semibold text-base mb-4">
          {lang === 'ms' ? `Semua Isi Rumah (${households.length})` : `All Households (${households.length})`}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="text-brand-muted text-xs border-b border-brand-border">
                <th className="text-left py-2 pr-4">{lang === 'ms' ? 'Kod QR' : 'QR Code'}</th>
                <th className="text-left py-2 pr-4">{lang === 'ms' ? 'Unit' : 'Unit'}</th>
                <th className="text-right py-2 pr-4">{lang === 'ms' ? 'Mata' : 'Points'}</th>
                <th className="text-left py-2">{lang === 'ms' ? 'Imbasan Terakhir' : 'Last Scan'}</th>
              </tr>
            </thead>
            <tbody>
              {households.map(h => (
                <tr key={h.id} className="border-b border-brand-border last:border-0">
                  <td className="py-2 pr-4 text-brand-muted font-mono text-xs">{h.qrCode}</td>
                  <td className="py-2 pr-4 font-semibold text-brand-charcoal">{h.unit}</td>
                  <td className="py-2 pr-4 text-right text-brand-green font-bold">{h.points}</td>
                  <td className="py-2 text-brand-muted text-xs">
                    {h.lastScanAt ? formatDate(h.lastScanAt) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pb-8 text-center">
        <Link href="/" className="text-brand-muted text-sm hover:text-brand-green">
          ← {lang === 'ms' ? 'Laman Utama' : 'Back to Home'}
        </Link>
      </div>
    </main>
  )
}

// ── Page root ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { lang }  = useLang()
  const [password, setPassword] = useState<string | null>(null)

  useEffect(() => {
    const saved = sessionStorage.getItem('adminPw')
    if (saved) setPassword(saved)
  }, [])

  if (!password) return <LoginForm onLogin={pw => setPassword(pw)} lang={lang} />
  return <Dashboard password={password} lang={lang} />
}
