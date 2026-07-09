import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/voucher?code=VXXXXXXXX
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.toUpperCase().trim()
  if (!code) return Response.json({ error: 'Code required' }, { status: 400 })

  const voucher = await prisma.voucher.findUnique({
    where: { code },
    include: { household: { select: { unit: true, qrCode: true } } },
  })
  if (!voucher) return Response.json({ error: 'not_found' }, { status: 404 })

  return Response.json({
    code:        voucher.code,
    rewardKey:   voucher.rewardKey,
    rewardLabel: voucher.rewardLabel,
    pointsCost:  voucher.pointsCost,
    status:      voucher.status,
    unit:        voucher.household.unit,
    createdAt:   voucher.createdAt,
    redeemedAt:  voucher.redeemedAt,
  })
}

// POST /api/voucher  body: { code, password }  — staff marks voucher redeemed
export async function POST(request: NextRequest) {
  let body: { code?: string; password?: string }
  try { body = await request.json() } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Wrong password' }, { status: 401 })
  }

  const code = body.code?.toUpperCase().trim()
  if (!code) return Response.json({ error: 'Code required' }, { status: 400 })

  const voucher = await prisma.voucher.findUnique({ where: { code } })
  if (!voucher) return Response.json({ error: 'not_found' }, { status: 404 })
  if (voucher.status === 'redeemed') {
    return Response.json({ error: 'already_redeemed' }, { status: 409 })
  }

  await prisma.voucher.update({
    where: { code },
    data:  { status: 'redeemed', redeemedAt: new Date() },
  })

  return Response.json({ success: true })
}
