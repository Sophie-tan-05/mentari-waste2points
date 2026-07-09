import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/household/register-phone  body: { qrCode, phone }
export async function POST(req: NextRequest) {
  const { qrCode, phone: rawPhone } = await req.json()
  const phone = rawPhone?.trim().replace(/\s|-/g, '')

  if (!qrCode || !phone) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const mobileRe = /^(\+?60|0)1[0-9]{8,9}$/
  if (!mobileRe.test(phone)) {
    return NextResponse.json({ error: 'invalid_phone' }, { status: 422 })
  }

  const household = await prisma.household.findUnique({ where: { qrCode } })
  if (!household) return NextResponse.json({ error: 'QR not found' }, { status: 404 })

  const existing = await prisma.household.findUnique({ where: { phone } })
  if (existing && existing.qrCode !== qrCode) {
    return NextResponse.json({ error: 'phone_taken' }, { status: 409 })
  }

  await prisma.household.update({ where: { qrCode }, data: { phone } })
  return NextResponse.json({ success: true })
}
