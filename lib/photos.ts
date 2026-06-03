import { writeFile, mkdir } from 'fs/promises'
import * as path from 'path'

export async function savePhoto(file: File, qrCode: string): Promise<string> {
  // On Vercel the filesystem is read-only, so we try local disk first and
  // fall back to an inline base64 data URL that works anywhere.
  if (process.env.NODE_ENV !== 'production') {
    try {
      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      const filename = `${Date.now()}-${qrCode}.${ext}`
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      await mkdir(uploadDir, { recursive: true })
      await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()))
      return `/uploads/${filename}`
    } catch {
      // fall through to base64
    }
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString('base64')
  return `data:${file.type};base64,${base64}`
}
