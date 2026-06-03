'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/components/LanguageProvider'
import RewardCard from '@/components/RewardCard'
import { REWARDS } from '@/lib/rewards'

type Reward = typeof REWARDS[number]

interface HouseholdData {
  qrCode: string
  unit: string
  points: number
}

type PageState = 'loading' | 'error' | 'idle' | 'confirming' | 'redeeming' | 'success'

export default function RedeemPage() {
  const params = useParams()
  const qrCode = params.qrCode as string
  const { lang } = useLang()

  const [household, setHousehold] = useState<HouseholdData | null>(null)
  const [pageState, setPageState] = useState<PageState>('loading')
  const [selected, setSelected] = useState<Reward | null>(null)
  const [successReward, setSuccessReward] = useState<Reward | null>(null)
  const [newTotal, setNewTotal] = useState<number | null>(null)
  const [apiError, setApiError] = useState('')

  const fetchHousehold = useCallback(async () => {
    const res = await fetch(`/api/points?qrCode=${encodeURIComponent(qrCode)}`)
    if (!res.ok) { setPageState('error'); return }
    const data = await res.json()
    setHousehold(data.household)
    setPageState('idle')
  }, [qrCode])

  useEffect(() => { fetchHousehold() }, [fetchHousehold])

  function handleSelect(reward: Reward) {
    setSelected(reward)
    setApiError('')
    setPageState('confirming')
  }

  async function handleConfirm() {
    if (!selected) return
    setPageState('redeeming')
    setApiError('')

    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCode, rewardKey: selected.key }),
    })
    const data = await res.json()

    if (data.success) {
      setSuccessReward(selected)
      setNewTotal(data.newTotal)
      setHousehold(h => h ? { ...h, points: data.newTotal } : h)
      setPageState('success')
    } else {
      setApiError(data.error ?? 'Something went wrong')
      setPageState('confirming')
    }
  }

  function handleCancel() {
    setSelected(null)
    setApiError('')
    setPageState('idle')
  }

  function handleDone() {
    setSelected(null)
    setSuccessReward(null)
    setNewTotal(null)
    setPageState('idle')
  }

  if (pageState === 'loading') {
    return (
      <main className="max-w-md mx-auto px-4 py-6 flex items-center justify-center min-h-[60vh]">
        <p className="text-brand-muted text-sm">Loading…</p>
      </main>
    )
  }

  if (pageState === 'error' || !household) {
    return (
      <main className="max-w-md mx-auto px-4 py-6 text-center">
        <p className="text-brand-reject font-semibold">QR not found. Contact your block leader.</p>
        <Link href="/" className="mt-4 inline-block text-brand-green text-sm underline">← Home</Link>
      </main>
    )
  }

  // Success screen
  if (pageState === 'success' && successReward) {
    const rewardLabel = lang === 'ms' ? successReward.labelMs : successReward.label
    return (
      <main className="max-w-md mx-auto px-4 py-6 space-y-5">
        <Link href="/" className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors">
          ← Home / Laman Utama
        </Link>

        <div className="bg-brand-green-pale border border-brand-green-light rounded-2xl p-8 text-center animate-success">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-brand-charcoal text-xl font-bold mb-1">
            {lang === 'ms' ? 'Tebus Berjaya!' : 'Redemption Successful!'}
          </h2>
          <p className="text-brand-muted text-sm mb-4">
            {lang === 'ms'
              ? `Anda telah menebus ${rewardLabel}`
              : `You redeemed ${rewardLabel}`}
          </p>

          {/* Confetti-style emoji burst */}
          <div className="text-2xl mb-4 space-x-1">🎉 🎊 ♻️ 🎊 🎉</div>

          {/* New balance */}
          <div className="bg-white rounded-xl border border-brand-border p-4 mb-5">
            <p className="text-brand-muted text-xs mb-1">
              {lang === 'ms' ? 'Baki Mata' : 'Remaining Points'}
            </p>
            <p className="text-brand-green text-4xl font-bold">{newTotal ?? household.points}</p>
          </div>

          <button
            onClick={handleDone}
            className="w-full h-14 bg-brand-green text-white rounded-xl font-bold text-base"
          >
            {lang === 'ms' ? 'Tebus Lagi' : 'Redeem More'}
          </button>
          <Link
            href={`/points/${qrCode}`}
            className="mt-3 flex items-center justify-center w-full h-12 border-2 border-brand-green text-brand-green rounded-xl font-semibold text-sm"
          >
            {lang === 'ms' ? 'Lihat Rekod' : 'View History'}
          </Link>
        </div>
      </main>
    )
  }

  const points = household.points

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5">
      <Link href="/" className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors">
        ← Home / Laman Utama
      </Link>

      {/* Points balance */}
      <div className="bg-white rounded-2xl border border-brand-border p-5 text-center shadow-sm">
        <p className="text-brand-muted text-sm mb-1">{lang === 'ms' ? 'Mata Anda' : 'Your Points'}</p>
        <p className="text-brand-green text-5xl font-bold">{points}</p>
        <p className="text-brand-muted text-xs mt-1">
          {lang === 'ms' ? '♻️ Pilih hadiah di bawah' : '♻️ Choose a reward below'}
        </p>
      </div>

      {/* Section header */}
      <h2 className="text-brand-charcoal font-semibold text-base">
        {lang === 'ms' ? 'Katalog Hadiah / Reward Catalogue' : 'Reward Catalogue / Katalog Hadiah'}
      </h2>

      {/* Reward grid */}
      <div className="grid grid-cols-2 gap-3">
        {REWARDS.map(reward => (
          <RewardCard
            key={reward.key}
            reward={reward}
            canAfford={points >= reward.points}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* Confirmation bottom sheet / modal */}
      {(pageState === 'confirming' || pageState === 'redeeming') && selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 z-20"
            onClick={pageState === 'confirming' ? handleCancel : undefined}
          />

          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl p-6 shadow-2xl max-w-md mx-auto animate-success">
            <div className="w-10 h-1 bg-brand-border rounded-full mx-auto mb-5" />

            <div className="text-center mb-5">
              <div className="text-4xl mb-2">🎁</div>
              <h3 className="text-brand-charcoal text-base font-bold mb-1">
                {lang === 'ms'
                  ? `Tebus ${selected.labelMs}?`
                  : `Redeem ${selected.label}?`}
              </h3>
              <p className="text-brand-muted text-sm">
                {lang === 'ms'
                  ? `untuk ${selected.points} mata`
                  : `for ${selected.points} points`}
              </p>
              <p className="text-brand-muted text-xs mt-1">
                {lang === 'ms'
                  ? `Baki selepas: ${points - selected.points} mata`
                  : `Balance after: ${points - selected.points} points`}
              </p>
            </div>

            {apiError && (
              <div className="bg-brand-reject-bg border border-brand-reject rounded-xl p-3 mb-4 text-center">
                <p className="text-brand-reject text-sm font-semibold">❌ {apiError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={pageState === 'redeeming'}
                className="flex-1 h-14 border-2 border-brand-green text-brand-green rounded-xl font-semibold text-sm disabled:opacity-50"
              >
                {lang === 'ms' ? 'Batal' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={pageState === 'redeeming'}
                className="flex-1 h-14 bg-brand-green text-white rounded-xl font-bold text-sm disabled:bg-brand-green-light disabled:text-brand-muted"
              >
                {pageState === 'redeeming'
                  ? (lang === 'ms' ? 'Memproses…' : 'Processing…')
                  : (lang === 'ms' ? 'Sahkan / Confirm' : 'Confirm / Sahkan')}
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
