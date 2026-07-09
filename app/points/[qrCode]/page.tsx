'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import PointsBadge from '@/components/PointsBadge'

const CATEGORIES = {
  PLASTIC:     { icon: '🧴', en: 'Plastic',     ms: 'Plastik'      },
  PAPER:       { icon: '📄', en: 'Paper',        ms: 'Kertas'       },
  GLASS_METAL: { icon: '🍶', en: 'Glass-Metal',  ms: 'Kaca & Logam' },
} as const

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

interface Scan {
  id: string
  category: string
  weightKg: number
  pointsEarned: number
  status: string
  createdAt: string
}

interface HouseholdData {
  qrCode: string
  unit: string
  points: number
  pendingPoints: number
}

export default function PointsPage() {
  const params  = useParams()
  const qrCode  = params.qrCode as string
  const { lang } = useLang()

  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [scans,     setScans]     = useState<Scan[]>([])
  const [loading,   setLoading]   = useState(true)
  const [gone,      setGone]      = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/points?qrCode=${encodeURIComponent(qrCode)}`)
    if (res.status === 404) { setGone(true); setLoading(false); return }
    if (!res.ok)            { setLoading(false); return }
    const data = await res.json()
    setHousehold(data.household)
    setScans(data.scans)
    setLoading(false)
  }, [qrCode])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) {
    return (
      <main className="max-w-md mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-brand-muted text-sm">Loading…</p>
      </main>
    )
  }

  if (gone || !household) {
    return (
      <main className="max-w-md mx-auto px-4 py-6 text-center">
        <p className="text-brand-reject font-semibold">
          {lang === 'ms' ? 'QR tidak dijumpai. Hubungi ketua blok anda.' : 'QR not found. Contact your block leader.'}
        </p>
        <Link href="/" className="mt-4 inline-block text-brand-green text-sm underline">← Home</Link>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link
        href="/"
        className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors"
      >
        ← {lang === 'ms' ? 'Laman Utama' : 'Home'}
      </Link>

      <PointsBadge unit={household.unit} points={household.points} />

      {/* Pending points banner */}
      {household.pendingPoints > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3">
          <span className="text-2xl shrink-0">⏳</span>
          <div>
            <p className="font-bold text-amber-800 text-sm m-0">
              {lang === 'ms' ? `${household.pendingPoints} mata dalam semakan` : `${household.pendingPoints} pts pending approval`}
            </p>
            <p className="text-amber-700 text-xs m-0 mt-1 leading-snug">
              {lang === 'ms'
                ? 'Mata akan dikreditkan selepas ketua blok mengesahkan berat rasmi trak KDEB.'
                : 'Points released once the committee verifies the official KDEB truck weight receipt.'}
            </p>
          </div>
        </div>
      )}

      {/* History header */}
      <div className="flex items-center justify-between">
        <h2 className="text-brand-charcoal font-semibold text-base">
          {lang === 'ms' ? 'Rekod Kitar Semula' : 'Recycling History'}
        </h2>
        <span className="text-brand-muted text-xs">
          {scans.length} {lang === 'ms' ? 'rekod' : 'records'}
        </span>
      </div>

      {/* Empty state */}
      {scans.length === 0 && (
        <div className="bg-white rounded-2xl border border-brand-border p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">📦</div>
          <p className="text-brand-charcoal font-semibold mb-1">
            {lang === 'ms' ? 'Belum ada rekod.' : 'No records yet.'}
          </p>
          <p className="text-brand-muted text-sm">
            {lang === 'ms' ? 'Mula kitar semula hari ini!' : 'Start recycling today!'}
          </p>
          <Link
            href={`/scan/${qrCode}`}
            className="mt-4 inline-block bg-brand-green text-white px-6 py-3 rounded-xl font-semibold text-sm"
          >
            {lang === 'ms' ? 'Hantar Kitar Semula ♻️' : 'Submit Recycling ♻️'}
          </Link>
        </div>
      )}

      {/* Scan history cards */}
      {scans.length > 0 && (
        <div className="space-y-3">
          {scans.map(scan => {
            const catKey  = scan.category as keyof typeof CATEGORIES
            const cat     = CATEGORIES[catKey] ?? { icon: '♻️', en: scan.category, ms: scan.category }
            const approved = scan.status === 'approved'

            return (
              <div
                key={scan.id}
                className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm"
              >
                {/* Top row: category + points pill */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-brand-charcoal font-semibold text-sm">
                      {lang === 'ms' ? cat.ms : cat.en}
                    </span>
                  </div>
                  <span className="bg-brand-green-pale text-brand-green text-xs font-bold px-3 py-1 rounded-full">
                    +{scan.pointsEarned} pts
                  </span>
                </div>

                {/* Bottom row: weight + date */}
                <div className="flex items-center justify-between text-sm text-brand-muted">
                  <span>{scan.weightKg} kg</span>
                  <span className="text-xs">{formatDate(scan.createdAt)}</span>
                </div>

                {/* Status badge */}
                <div className="mt-2 pt-2 border-t border-brand-border">
                  {scan.status === 'pending' ? (
                    <span className="text-xs text-amber-600 font-semibold">
                      ⏳ {lang === 'ms' ? 'Menunggu kelulusan' : 'Pending approval'}
                    </span>
                  ) : approved ? (
                    <span className="text-xs text-brand-green font-semibold">
                      ✅ {lang === 'ms' ? 'Diluluskan' : 'Approved'}
                    </span>
                  ) : (
                    <span className="text-xs text-brand-reject font-semibold">
                      ❌ {lang === 'ms' ? 'Ditolak' : 'Rejected'}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Redeem button */}
      <Link
        href={`/redeem/${qrCode}`}
        className="flex items-center justify-center w-full h-14 bg-brand-green text-white rounded-xl font-bold text-base gap-2"
      >
        🎁 {lang === 'ms' ? 'Tebus Hadiah' : 'Redeem Rewards'}
      </Link>
    </main>
  )
}
