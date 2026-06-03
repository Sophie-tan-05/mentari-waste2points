import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const qrCode = request.nextUrl.searchParams.get('qrCode')
  if (!qrCode) return Response.json({ exists: false })

  try {
    const household = await prisma.household.findUnique({
      where: { qrCode },
      select: { qrCode: true },
    })
    return Response.json({ exists: !!household })
  } catch (e) {
    console.error('[validate] DB error:', e)
    return Response.json({ exists: false, error: String(e) }, { status: 500 })
  }
}
