import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const qrCode = request.nextUrl.searchParams.get('qrCode')
  if (!qrCode) return Response.json({ error: 'qrCode required' }, { status: 400 })

  const household = await prisma.household.findUnique({
    where: { qrCode },
    include: { scans: { orderBy: { createdAt: 'desc' } } },
  })

  if (!household) return Response.json({ error: 'Not found' }, { status: 404 })

  return Response.json({
    household: {
      qrCode:  household.qrCode,
      unit:    household.unit,
      points:  household.points,
    },
    scans: household.scans.map(s => ({
      id:           s.id,
      category:     s.category,
      weightKg:     s.weightKg,
      pointsEarned: s.pointsEarned,
      status:       s.status,
      photoUrl:     s.photoUrl,
      createdAt:    s.createdAt,
    })),
  })
}
