interface Props {
  unit: string
  points: number
}

export default function PointsBadge({ unit, points }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-brand-border p-6 text-center shadow-sm">
      <p className="text-brand-muted text-sm mb-1">Unit {unit}</p>
      <p className="text-brand-green text-5xl font-bold">{points}</p>
      <p className="text-brand-muted text-xs mt-1">♻️ Mata / Points</p>
    </div>
  )
}
