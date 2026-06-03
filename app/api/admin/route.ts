import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

function startOf(offsetDays: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - offsetDays)
  return d
}

export async function POST(request: NextRequest) {
  let body: { password?: string }
  try { body = await request.json() } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: 'Kata laluan salah / Wrong password' }, { status: 401 })
  }

  const today   = startOf(0)
  const weekAgo = startOf(6)

  const [scansToday, scansWeek, allScans, households] = await Promise.all([
    prisma.scan.count({ where: { createdAt: { gte: today } } }),
    prisma.scan.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.scan.findMany({
      include: { household: { select: { unit: true, qrCode: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.household.findMany({
      include: { scans: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { points: 'desc' },
    }),
  ])

  const totalKg = allScans.reduce((s, sc) => s + sc.weightKg, 0)
  const kgByCategory: Record<string, number> = {}
  for (const sc of allScans) {
    kgByCategory[sc.category] = (kgByCategory[sc.category] ?? 0) + sc.weightKg
  }

  // Top 5 by scan count
  const statsMap: Record<string, { unit: string; qrCode: string; scans: number; kg: number; points: number }> = {}
  for (const sc of allScans) {
    if (!statsMap[sc.householdId]) {
      statsMap[sc.householdId] = { unit: sc.household.unit, qrCode: sc.household.qrCode, scans: 0, kg: 0, points: 0 }
    }
    statsMap[sc.householdId].scans += 1
    statsMap[sc.householdId].kg   += sc.weightKg
  }
  for (const h of households) {
    if (statsMap[h.id]) statsMap[h.id].points = h.points
  }
  const top5 = Object.values(statsMap).sort((a, b) => b.scans - a.scans).slice(0, 5)

  return Response.json({
    success: true,
    stats: {
      scansToday,
      scansWeek,
      totalKg: Math.round(totalKg * 100) / 100,
      kgByCategory,
    },
    top5,
    scans: allScans.map(sc => ({
      id:           sc.id,
      unit:         sc.household.unit,
      qrCode:       sc.household.qrCode,
      category:     sc.category,
      weightKg:     sc.weightKg,
      pointsEarned: sc.pointsEarned,
      photoUrl:     sc.photoUrl,
      status:       sc.status,
      createdAt:    sc.createdAt,
    })),
    households: households.map(h => ({
      id:         h.id,
      qrCode:     h.qrCode,
      unit:       h.unit,
      points:     h.points,
      lastScanAt: h.scans[0]?.createdAt ?? null,
    })),
  })
}
