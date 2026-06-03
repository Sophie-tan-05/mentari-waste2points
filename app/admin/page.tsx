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

      {/* ── 1. Stats cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal font-semibold text-base mb-4">
          {lang === 'ms' ? 'Kg mengikut Kategori' : 'Kg by Category'}
        </h2>
        <CategoryBar kgByCategory={stats.kgByCategory} lang={lang} />
      </div>

      {/* ── 3. Top 5 households ── */}
      <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
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
      <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
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
                        {approved ? (
                          <span className="text-xs text-brand-green font-semibold">
                            ✅ {lang === 'ms' ? 'Lulus' : 'Approved'}
                          </span>
                        ) : (
                          <span className="text-xs text-brand-reject font-semibold">
                            ❌ {lang === 'ms' ? 'Ditolak' : 'Rejected'}
                          </span>
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
      <QRCodesSection households={households} lang={lang} />

      {/* ── 6. All households table ── */}
      <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
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
