import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { REWARDS } from '@/lib/rewards'

export async function POST(request: NextRequest) {
  let body: { qrCode?: string; rewardKey?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { qrCode, rewardKey } = body
  if (!qrCode || !rewardKey) {
    return Response.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  const reward = REWARDS.find(r => r.key === rewardKey)
  if (!reward) {
    return Response.json({ success: false, error: 'Unknown reward' }, { status: 400 })
  }

  const household = await prisma.household.findUnique({ where: { qrCode } })
  if (!household) {
    return Response.json({ success: false, error: 'QR not found' }, { status: 404 })
  }

  if (household.points < reward.points) {
    return Response.json({ success: false, error: 'Mata tidak cukup / Insufficient points' }, { status: 400 })
  }

  await prisma.redemption.create({
    data: {
      householdId: household.id,
      rewardKey,
      pointsCost: reward.points,
    },
  })

  await prisma.household.update({
    where: { id: household.id },
    data: { points: { decrement: reward.points } },
  })

  return Response.json({
    success: true,
    newTotal: household.points - reward.points,
  })
}
