import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/login?phone=0123456789
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')?.trim().replace(/\s|-/g, '')
  if (!phone) return NextResponse.json({ error: 'Phone required' }, { status: 400 })

  const household = await prisma.household.findUnique({ where: { phone } })
  if (!household) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json({ qrCode: household.qrCode })
}
