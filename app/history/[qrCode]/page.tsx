'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
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
}

export default function RedemptionHistoryPage() {
  const params = useParams()
  const qrCode = params.qrCode as string
  const { lang } = useLang()

  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [redeemed, setRedeemed] = useState<Voucher[]>([])
  const [loading, setLoading] = useState(true)
  const [gone, setGone] = useState(false)

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/points?qrCode=${encodeURIComponent(qrCode)}`)
    if (res.status === 404) { setGone(true); setLoading(false); return }
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setHousehold(data.household)
    const vouchers: Voucher[] = data.vouchers ?? []
    setRedeemed(
      vouchers
        .filter(v => v.status === 'redeemed')
        .sort((a, b) => new Date(b.redeemedAt ?? b.createdAt).getTime() - new Date(a.redeemedAt ?? a.createdAt).getTime())
    )
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

  const totalPointsSpent = redeemed.reduce((sum, v) => sum + v.pointsCost, 0)

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link
        href={`/points/${qrCode}`}
        className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors"
      >
        ← {lang === 'ms' ? 'Mata Saya' : 'My Points'}
      </Link>

      <div>
        <h1 className="text-brand-charcoal text-2xl font-bold">
          {lang === 'ms' ? 'Sejarah Penebusan' : 'Redemption History'}
        </h1>
        <p className="text-brand-muted text-sm mt-1">
          {lang === 'ms' ? `Unit ${household.unit}` : `Unit ${household.unit}`}
        </p>
      </div>

      {redeemed.length > 0 && (
        <div className="bg-white rounded-2xl border border-brand-border p-5 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-brand-muted text-xs mb-1">
              {lang === 'ms' ? 'Jumlah Ditebus' : 'Total Redeemed'}
            </p>
            <p className="text-brand-charcoal text-2xl font-bold">
              {redeemed.length} {lang === 'ms' ? 'baucar' : 'vouchers'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-brand-muted text-xs mb-1">
              {lang === 'ms' ? 'Mata Digunakan' : 'Points Spent'}
            </p>
            <p className="text-brand-green text-2xl font-bold">{totalPointsSpent}</p>
          </div>
        </div>
      )}

      {redeemed.length === 0 ? (
        <div className="bg-white rounded-2xl border border-brand-border p-8 text-center shadow-sm">
          <div className="text-5xl mb-3">🧾</div>
          <p className="text-brand-charcoal font-semibold mb-1">
            {lang === 'ms' ? 'Belum ada penebusan.' : 'No redemptions yet.'}
          </p>
          <p className="text-brand-muted text-sm mb-4">
            {lang === 'ms' ? 'Baucar yang telah digunakan akan dipaparkan di sini.' : 'Vouchers you\'ve used will appear here.'}
          </p>
          <Link
            href={`/redeem/${qrCode}`}
            className="inline-block bg-brand-green text-white px-6 py-3 rounded-xl font-semibold text-sm"
          >
            {lang === 'ms' ? 'Tebus Hadiah 🎁' : 'Redeem Rewards 🎁'}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {redeemed.map(v => (
            <Link
              key={v.code}
              href={`/voucher/${v.code}`}
              className="block bg-white rounded-2xl border border-brand-border p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">🧾</span>
                    <span className="text-brand-charcoal font-semibold text-sm truncate">
                      {v.rewardLabel}
                    </span>
                  </div>
                  <p className="text-brand-muted text-xs">
                    {lang === 'ms' ? 'Ditebus' : 'Redeemed'}: {v.redeemedAt ? formatDate(v.redeemedAt) : '—'}
                  </p>
                  <p className="text-brand-muted font-mono text-xs mt-1 tracking-widest">{v.code}</p>
                </div>
                <span className="bg-brand-green-pale text-brand-green text-xs font-bold px-3 py-1 rounded-full shrink-0">
                  −{v.pointsCost} pts
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
