import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { REWARDS } from '@/lib/rewards'

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function generateCode(): string {
  return 'V' + Array.from({ length: 9 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
}

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

  // Generate a unique voucher code (retry on collision)
  let code = generateCode()
  let attempts = 0
  while (attempts < 5) {
    const exists = await prisma.voucher.findUnique({ where: { code } })
    if (!exists) break
    code = generateCode()
    attempts++
  }

  await prisma.$transaction([
    prisma.voucher.create({
      data: {
        code,
        householdId: household.id,
        rewardKey,
        rewardLabel: reward.label,
        pointsCost:  reward.points,
        status:      'active',
      },
    }),
    prisma.household.update({
      where: { id: household.id },
      data:  { points: { decrement: reward.points } },
    }),
  ])

  return Response.json({ success: true, voucherCode: code })
}
