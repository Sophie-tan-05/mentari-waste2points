'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
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

interface Voucher {
  code: string
  rewardLabel: string
  pointsCost: number
  status: string
  createdAt: string
  redeemedAt: string | null
}

interface HouseholdData {
  qrCode: string
  unit: string
  points: number
  pendingPoints: number
}

type Tab = 'recycling' | 'vouchers'

export default function PointsPage() {
  const params  = useParams()
  const qrCode  = params.qrCode as string
  const { lang } = useLang()
  const searchParams = useSearchParams()
  const initialTab: Tab = searchParams.get('tab') === 'vouchers' ? 'vouchers' : 'recycling'

  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [scans,     setScans]     = useState<Scan[]>([])
  const [vouchers,  setVouchers]  = useState<Voucher[]>([])
  const [loading,   setLoading]   = useState(true)
  const [gone,      setGone]      = useState(false)
  const [tab,       setTab]       = useState<Tab>(initialTab)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/points?qrCode=${encodeURIComponent(qrCode)}`)
    if (res.status === 404) { setGone(true); setLoading(false); return }
    if (!res.ok)            { setLoading(false); return }
    const data = await res.json()
    setHousehold(data.household)
    setScans(data.scans)
    setVouchers(data.vouchers ?? [])
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

  const activeVouchers   = vouchers.filter(v => v.status === 'active')
  const redeemedVouchers = vouchers.filter(v => v.status === 'redeemed')

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

      {/* Tab switcher */}
      <div className="flex bg-brand-green-pale rounded-xl p-1 gap-1">
        <button
          onClick={() => setTab('recycling')}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${
            tab === 'recycling'
              ? 'bg-white text-brand-green shadow-sm'
              : 'text-brand-muted'
          }`}
        >
          ♻️ {lang === 'ms' ? 'Rekod Kitar' : 'Recycling'}
          {scans.length > 0 && (
            <span className="ml-1 bg-brand-green-light text-brand-green text-xs px-1.5 py-0.5 rounded-full">
              {scans.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('vouchers')}
          className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-all ${
            tab === 'vouchers'
              ? 'bg-white text-brand-green shadow-sm'
              : 'text-brand-muted'
          }`}
        >
          🎫 {lang === 'ms' ? 'Baucar Saya' : 'My Vouchers'}
          {activeVouchers.length > 0 && (
            <span className="ml-1 bg-brand-green text-white text-xs px-1.5 py-0.5 rounded-full">
              {activeVouchers.length}
            </span>
          )}
        </button>
      </div>

      {/* ── RECYCLING TAB ── */}
      {tab === 'recycling' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-brand-charcoal font-semibold text-base">
              {lang === 'ms' ? 'Rekod Kitar Semula' : 'Recycling History'}
            </h2>
            <span className="text-brand-muted text-xs">
              {scans.length} {lang === 'ms' ? 'rekod' : 'records'}
            </span>
          </div>

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

          <div className="space-y-3">
            {scans.map(scan => {
              const catKey = scan.category as keyof typeof CATEGORIES
              const cat    = CATEGORIES[catKey] ?? { icon: '♻️', en: scan.category, ms: scan.category }

              return (
                <div key={scan.id} className="bg-white rounded-2xl border border-brand-border p-4 shadow-sm">
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

                  <div className="flex items-center justify-between text-sm text-brand-muted">
                    <span>{scan.weightKg} kg</span>
                    <span className="text-xs">{formatDate(scan.createdAt)}</span>
                  </div>

                  <div className="mt-2 pt-2 border-t border-brand-border">
                    {scan.status === 'pending' ? (
                      <span className="text-xs text-amber-600 font-semibold">
                        ⏳ {lang === 'ms' ? 'Menunggu kelulusan' : 'Pending approval'}
                      </span>
                    ) : scan.status === 'approved' ? (
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
        </>
      )}

      {/* ── VOUCHERS TAB ── */}
      {tab === 'vouchers' && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-brand-charcoal font-semibold text-base">
              {lang === 'ms' ? 'Baucar Saya' : 'My Vouchers'}
            </h2>
            <span className="text-brand-muted text-xs">
              {vouchers.length} {lang === 'ms' ? 'jumlah' : 'total'}
            </span>
          </div>

          {redeemedVouchers.length > 0 && (
            <Link
              href={`/history/${qrCode}`}
              className="flex items-center justify-between bg-brand-green-pale border border-brand-green-light rounded-xl px-4 py-3 text-sm font-semibold text-brand-green"
            >
              🧾 {lang === 'ms' ? 'Lihat Sejarah Penebusan' : 'View Redemption History'}
              <span>→</span>
            </Link>
          )}

          {vouchers.length === 0 && (
            <div className="bg-white rounded-2xl border border-brand-border p-8 text-center shadow-sm">
              <div className="text-5xl mb-3">🎫</div>
              <p className="text-brand-charcoal font-semibold mb-1">
                {lang === 'ms' ? 'Belum ada baucar.' : 'No vouchers yet.'}
              </p>
              <p className="text-brand-muted text-sm mb-4">
                {lang === 'ms' ? 'Tebus mata anda untuk jana baucar.' : 'Redeem your points to generate a voucher.'}
              </p>
              <Link
                href={`/redeem/${qrCode}`}
                className="inline-block bg-brand-green text-white px-6 py-3 rounded-xl font-semibold text-sm"
              >
                {lang === 'ms' ? 'Tebus Hadiah 🎁' : 'Redeem Rewards 🎁'}
              </Link>
            </div>
          )}

          {/* Active vouchers first */}
          {activeVouchers.length > 0 && (
            <div className="space-y-3">
              <p className="text-brand-charcoal text-xs font-semibold uppercase tracking-wide">
                {lang === 'ms' ? 'Aktif' : 'Active'}
              </p>
              {activeVouchers.map(v => (
                <Link
                  key={v.code}
                  href={`/voucher/${v.code}`}
                  className="block bg-white rounded-2xl border-2 border-brand-green p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🎫</span>
                        <span className="text-brand-charcoal font-semibold text-sm truncate">
                          {v.rewardLabel}
                        </span>
                      </div>
                      <p className="text-brand-muted text-xs">{formatDate(v.createdAt)}</p>
                      <p className="text-brand-charcoal font-mono text-xs mt-1 tracking-widest">{v.code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-brand-green text-white text-xs font-bold px-2 py-1 rounded-full block mb-1">
                        ACTIVE
                      </span>
                      <span className="text-brand-muted text-xs">{v.pointsCost} pts</span>
                    </div>
                  </div>
                  <p className="text-brand-green text-xs font-semibold mt-2">
                    {lang === 'ms' ? 'Ketik untuk lihat QR kod →' : 'Tap to view QR code →'}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Used vouchers */}
          {redeemedVouchers.length > 0 && (
            <div className="space-y-3">
              <p className="text-brand-charcoal text-xs font-semibold uppercase tracking-wide">
                {lang === 'ms' ? 'Telah Digunakan' : 'Used'}
              </p>
              {redeemedVouchers.map(v => (
                <Link
                  key={v.code}
                  href={`/voucher/${v.code}`}
                  className="block bg-white rounded-2xl border border-brand-border p-4 shadow-sm opacity-60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">🎫</span>
                        <span className="text-brand-charcoal font-semibold text-sm truncate line-through">
                          {v.rewardLabel}
                        </span>
                      </div>
                      <p className="text-brand-muted text-xs">
                        {lang === 'ms' ? 'Digunakan' : 'Used'}: {v.redeemedAt ? formatDate(v.redeemedAt) : '—'}
                      </p>
                      <p className="text-brand-muted font-mono text-xs mt-1 tracking-widest">{v.code}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="bg-brand-border text-brand-muted text-xs font-bold px-2 py-1 rounded-full block mb-1">
                        USED
                      </span>
                      <span className="text-brand-muted text-xs">{v.pointsCost} pts</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
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
