'use client'

import { REWARDS } from '@/lib/rewards'
import { useLang } from '@/components/LanguageProvider'

type Reward = typeof REWARDS[number]

interface RewardCardProps {
  reward: Reward
  canAfford: boolean
  onSelect: (reward: Reward) => void
}

export default function RewardCard({ reward, canAfford, onSelect }: RewardCardProps) {
  const { lang } = useLang()
  const label = lang === 'ms' ? reward.labelMs : reward.label

  return (
    <div
      className={[
        'relative bg-white rounded-2xl border p-4 flex flex-col gap-2 shadow-sm transition-all',
        canAfford
          ? 'border-brand-border active:border-brand-green active:shadow-md cursor-pointer'
          : 'border-brand-border opacity-40 cursor-not-allowed',
      ].join(' ')}
      onClick={() => canAfford && onSelect(reward)}
      title={canAfford ? undefined : 'Mata tidak cukup / Insufficient points'}
    >
      {/* Points pill — top right */}
      <span className="absolute top-3 right-3 bg-brand-green-pale text-brand-green text-xs font-bold px-2 py-0.5 rounded-full">
        {reward.points} pts
      </span>

      {/* Emoji icon placeholder */}
      <span className="text-3xl">🎁</span>

      {/* Item name */}
      <p className="text-brand-charcoal text-sm font-semibold leading-tight pr-12">{label}</p>
    </div>
  )
}
