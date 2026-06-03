import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { calcPoints } from '@/lib/points'
import { savePhoto } from '@/lib/photos'

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json({ success: false, error: 'Invalid form data' }, { status: 400 })
  }

  try {
    return await handleScan(formData)
  } catch (e) {
    console.error('[scan] unhandled error:', e)
    return Response.json({ success: false, error: 'Server error. Please try again.' }, { status: 500 })
  }
}

async function handleScan(formData: FormData) {

  const qrCode     = formData.get('qrCode')     as string | null
  const category   = formData.get('category')   as string | null
  const weightKgRaw = formData.get('weightKg')  as string | null
  const photo      = formData.get('photo')

  // Validate presence
  if (!qrCode || !category || !weightKgRaw) {
    return Response.json({ success: false, error: 'Missing fields' }, { status: 400 })
  }

  const weightKg = parseFloat(weightKgRaw)

  const household = await prisma.household.findUnique({ where: { qrCode } })
  if (!household)           return Response.json({ success: false, error: 'QR not found' })
  if (isNaN(weightKg) || weightKg <= 0) return Response.json({ success: false, error: 'Weight must be greater than 0' })
  if (weightKg > 50)        return Response.json({ success: false, error: 'Weight seems too high — please check' })
  if (!photo || typeof photo === 'string' || (photo as File).size === 0)
    return Response.json({ success: false, error: 'Photo is required' })

  // Save photo
  const photoUrl = await savePhoto(photo as File, qrCode)

  // Points calculation using total scans to date
  const totalScans = await prisma.scan.count({ where: { householdId: household.id } })
  const pointsEarned = calcPoints(weightKg, totalScans)

  // Persist scan + update balance
  await prisma.scan.create({
    data: {
      householdId:  household.id,
      category,
      weightKg,
      pointsEarned,
      photoUrl,
      status: 'approved',
    },
  })
  await prisma.household.update({
    where: { id: household.id },
    data:  { points: { increment: pointsEarned } },
  })

  return Response.json({
    success: true,
    pointsEarned,
    newTotal: household.points + pointsEarned,
  })
}
