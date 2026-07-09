import { NextRequest } from 'next/server'
import { createHash } from 'crypto'
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

  // Compute SHA-256 hash of photo bytes
  const photoBuffer = Buffer.from(await (photo as File).arrayBuffer())
  const photoHash   = createHash('sha256').update(photoBuffer).digest('hex')

  // Duplicate photo check — reject if same photo was ever submitted before
  const duplicate = await prisma.scan.findFirst({ where: { photoHash } })
  if (duplicate) {
    return Response.json({
      success: false,
      error: 'Foto ini sudah pernah dihantar sebelum ini. Sila ambil gambar baru. / This photo was already submitted before. Please take a new photo.',
    })
  }

  // Save photo
  const photoUrl = await savePhoto(photo as File, qrCode)

  // Points calculation using total scans to date
  const totalScans = await prisma.scan.count({ where: { householdId: household.id } })
  const pointsEarned = calcPoints(weightKg, totalScans)

  // Persist scan as PENDING — points not added until committee approves the week
  await prisma.scan.create({
    data: {
      householdId:  household.id,
      category,
      weightKg,
      pointsEarned,
      photoUrl,
      photoHash,
      status: 'pending',
    },
  })

  return Response.json({
    success: true,
    pointsEarned,
    status: 'pending',
  })
}
