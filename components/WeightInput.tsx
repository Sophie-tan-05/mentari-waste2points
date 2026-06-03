'use client'

interface Props {
  value: number | ''
  onChange: (v: number | '') => void
  lang: string
}

export default function WeightInput({ value, onChange, lang }: Props) {
  return (
    <div className="space-y-1">
      <label className="block text-brand-charcoal text-base font-semibold">
        Berat (kg) / Weight (kg)
      </label>
      <input
        type="number"
        step="0.1"
        min="0.1"
        max="50"
        value={value}
        onChange={e =>
          onChange(e.target.value === '' ? '' : parseFloat(e.target.value))
        }
        placeholder="0.0"
        className="w-full h-14 px-4 rounded-xl border-2 border-brand-border text-brand-charcoal text-xl font-bold focus:outline-none focus:border-brand-green transition-colors"
      />
      <p className="text-brand-muted text-sm">
        {lang === 'ms'
          ? 'Taip nombor yang anda lihat pada penimbang / Type the number you see on the scale'
          : 'Type the number you see on the scale / Taip nombor yang anda lihat pada penimbang'}
      </p>
    </div>
  )
}
