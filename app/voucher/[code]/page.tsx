'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface VoucherData {
  code: string
  rewardLabel: string
  pointsCost: number
  status: string
  unit: string
  createdAt: string
  redeemedAt: string | null
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(new Date(iso))
}

export default function VoucherPage() {
  const { code } = useParams() as { code: string }
  const [voucher, setVoucher] = useState<VoucherData | null>(null)
  const [notFound, setNotFound] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    fetch(`/api/voucher?code=${encodeURIComponent(code)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(setVoucher)
      .catch(() => setNotFound(true))
  }, [code])

  // Draw QR code on canvas once voucher data loads
  useEffect(() => {
    if (!voucher || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, voucher.code, {
        width: 220,
        margin: 2,
        color: { dark: '#1B2E1C', light: '#FFFFFF' },
      })
    })
  }, [voucher])

  if (notFound) {
    return (
      <main className="max-w-md mx-auto px-4 py-10 text-center">
        <p className="text-5xl mb-4">❌</p>
        <p className="font-bold text-brand-charcoal text-lg mb-1">Voucher not found</p>
        <p className="text-brand-muted text-sm mb-6">The code <strong>{code}</strong> does not exist.</p>
        <Link href="/" className="text-brand-green text-sm underline">← Home</Link>
      </main>
    )
  }

  if (!voucher) {
    return (
      <main className="max-w-md mx-auto px-4 py-10 flex justify-center">
        <p className="text-brand-muted text-sm">Loading…</p>
      </main>
    )
  }

  const redeemed = voucher.status === 'redeemed'

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href="/" className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors">
        ← Home
      </Link>

      {/* Voucher card */}
      <div className={`rounded-2xl border-2 overflow-hidden shadow-sm ${redeemed ? 'border-brand-border opacity-60' : 'border-brand-green'}`}>

        {/* Header band */}
        <div className={`px-5 py-3 flex items-center justify-between ${redeemed ? 'bg-brand-border' : 'bg-brand-green'}`}>
          <div>
            <p className="text-white font-bold text-sm leading-tight">♻️ Waste2Points</p>
            <p className="text-white/80 text-xs">Digital Voucher · Desa Mentari Blok 8</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${redeemed ? 'bg-white/30 text-white' : 'bg-white text-brand-green'}`}>
            {redeemed ? 'REDEEMED' : 'ACTIVE'}
          </span>
        </div>

        {/* Body */}
        <div className="bg-white px-5 py-5">
          <p className="text-brand-muted text-xs mb-1">Reward</p>
          <p className="text-brand-charcoal text-xl font-bold mb-4">{voucher.rewardLabel}</p>

          {/* QR code */}
          <div className="flex justify-center mb-4">
            <div className="rounded-xl border-2 border-brand-border p-3 inline-block">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Code */}
          <div className="text-center mb-4">
            <p className="text-brand-muted text-xs mb-1">Voucher Code</p>
            <p className="text-brand-charcoal text-2xl font-bold tracking-widest">{voucher.code}</p>
          </div>

          {/* Tear line */}
          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 border-t-2 border-dashed border-brand-border" />
            <span className="text-brand-muted text-xs">✂</span>
            <div className="flex-1 border-t-2 border-dashed border-brand-border" />
          </div>

          {/* Details */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-brand-muted">Unit</span>
              <span className="font-semibold text-brand-charcoal">{voucher.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Points used</span>
              <span className="font-semibold text-brand-charcoal">{voucher.pointsCost} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted">Issued</span>
              <span className="font-semibold text-brand-charcoal">{formatDate(voucher.createdAt)}</span>
            </div>
            {redeemed && voucher.redeemedAt && (
              <div className="flex justify-between">
                <span className="text-brand-muted">Redeemed</span>
                <span className="font-semibold text-brand-reject">{formatDate(voucher.redeemedAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-brand-green-pale px-5 py-3 text-center">
          <p className="text-brand-muted text-xs">
            {redeemed
              ? 'This voucher has already been redeemed.'
              : 'Show this QR code at the Lotus\'s checkout counter to redeem your reward.'}
          </p>
        </div>
      </div>

      {redeemed && (
        <p className="text-center text-brand-muted text-xs">
          Voucher was used on {voucher.redeemedAt ? formatDate(voucher.redeemedAt) : '—'}
        </p>
      )}
    </main>
  )
}
