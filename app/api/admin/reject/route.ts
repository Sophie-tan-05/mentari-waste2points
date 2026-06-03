import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  let body: { scanId?: string; adminPassword?: string }
  try { body = await request.json() } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.adminPassword !== process.env.ADMIN_PASSWORD) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { scanId } = body
  if (!scanId) {
    return Response.json({ success: false, error: 'Missing scanId' }, { status: 400 })
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { household: true },
  })

  if (!scan) {
    return Response.json({ success: false, error: 'Scan not found' }, { status: 404 })
  }

  if (scan.status === 'rejected') {
    return Response.json({ success: false, error: 'Already rejected' }, { status: 400 })
  }

  await prisma.scan.update({
    where: { id: scanId },
    data: { status: 'rejected', rejectedAt: new Date() },
  })

  const updated = await prisma.household.update({
    where: { id: scan.householdId },
    data: { points: { decrement: scan.pointsEarned } },
  })

  return Response.json({ success: true, newHouseholdTotal: updated.points })
}
