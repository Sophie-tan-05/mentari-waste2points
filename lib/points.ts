const POINTS_PER_KG = 10
const LAUNCH_BONUS_MULTIPLIER = 2
const LAUNCH_BONUS_LIMIT = 50 // first 50 scans get double points

export function calcPoints(weightKg: number, totalScansToDate: number): number {
  const multiplier = totalScansToDate < LAUNCH_BONUS_LIMIT ? LAUNCH_BONUS_MULTIPLIER : 1
  return Math.round(weightKg * POINTS_PER_KG * multiplier)
}
