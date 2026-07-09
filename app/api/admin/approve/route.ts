import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/admin/approve
// body: { password, truckWeightKg, weekLabel, scalingFactor? }
// scalingFactor: if provided, multiply each scan's pointsEarned before crediting
export async function POST(request: NextRequest) {
  let body: { password?: string; truckWeightKg?: number; weekLabel?: string; scalingFactor?: number }
  try { body = await request.json() } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: 'Wrong password' }, { status: 401 })
  }

  const truckWeightKg = Number(body.truckWeightKg)
  if (!truckWeightKg || truckWeightKg <= 0) {
    return Response.json({ success: false, error: 'Enter the truck weight' }, { status: 400 })
  }

  const weekLabel     = body.weekLabel ?? 'Unknown week'
  const scalingFactor = body.scalingFactor ?? 1

  const pendingScans = await prisma.scan.findMany({
    where: { status: 'pending' },
    include: { household: true },
  })

  if (pendingScans.length === 0) {
    return Response.json({ success: false, error: 'No pending submissions to approve' }, { status: 400 })
  }

  const digitalWeightKg = pendingScans.reduce((s, sc) => s + sc.weightKg, 0)

  // Apply scaling factor to each scan's points, grouped by household
  const pointsByHousehold: Record<string, number> = {}
  for (const sc of pendingScans) {
    const scaled = Math.round(sc.pointsEarned * scalingFactor)
    pointsByHousehold[sc.householdId] = (pointsByHousehold[sc.householdId] ?? 0) + scaled
  }

  await prisma.$transaction([
    prisma.scan.updateMany({ where: { status: 'pending' }, data: { status: 'approved' } }),
    prisma.approvalBatch.create({
      data: {
        weekLabel,
        truckWeightKg,
        digitalWeightKg: Math.round(digitalWeightKg * 100) / 100,
        scanCount: pendingScans.length,
      },
    }),
    ...Object.entries(pointsByHousehold).map(([householdId, pts]) =>
      prisma.household.update({ where: { id: householdId }, data: { points: { increment: pts } } })
    ),
  ])

  const variancePct = Math.abs(((digitalWeightKg - truckWeightKg) / truckWeightKg) * 100)

  return Response.json({
    success: true,
    scanCount:          pendingScans.length,
    digitalWeightKg:    Math.round(digitalWeightKg * 100) / 100,
    truckWeightKg,
    scalingFactor:      Math.round(scalingFactor * 1000) / 1000,
    variancePct:        Math.round(variancePct * 10) / 10,
    householdsRewarded: Object.keys(pointsByHousehold).length,
  })
}
