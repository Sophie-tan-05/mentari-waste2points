'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLang } from './LanguageProvider'
import WeightInput from './WeightInput'
import PhotoUpload from './PhotoUpload'

// Resize + re-encode to JPEG so the upload stays well under Vercel's 4.5 MB body limit
async function compressPhoto(file: File, maxPx = 1280, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

const CATEGORIES = [
  { key: 'PLASTIC',    icon: '🧴', en: 'Plastic',     ms: 'Plastik'       },
  { key: 'PAPER',      icon: '📄', en: 'Paper',       ms: 'Kertas'        },
  { key: 'GLASS_METAL',icon: '🍶', en: 'Glass-Metal', ms: 'Kaca & Logam'  },
]

interface Props {
  qrCode: string
}

interface SuccessResult {
  pointsEarned: number
}

export default function ScanForm({ qrCode }: Props) {
  const { lang } = useLang()
  const [category, setCategory]     = useState('')
  const [weightKg, setWeightKg]     = useState<number | ''>('')
  const [photo,    setPhoto]        = useState<File | null>(null)
  const [loading,  setLoading]      = useState(false)
  const [result,   setResult]       = useState<SuccessResult | null>(null)
  const [error,    setError]        = useState('')

  const canSubmit = !!(category && weightKg !== '' && (weightKg as number) > 0 && photo) && !loading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setLoading(true)
    setError('')

    const compressed = await compressPhoto(photo as File)

    const fd = new FormData()
    fd.append('qrCode',   qrCode)
    fd.append('category', category)
    fd.append('weightKg', String(weightKg))
    fd.append('photo',    compressed, 'photo.jpg')

    try {
      const res  = await fetch('/api/scan', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        setResult({ pointsEarned: data.pointsEarned })
      } else {
        const msgs: Record<string, string> = {
          'QR not found':                   lang === 'ms' ? 'Kod QR tidak dijumpai.'                          : 'QR not found.',
          'Weight must be greater than 0':  lang === 'ms' ? 'Berat mesti lebih daripada 0.'                   : 'Weight must be greater than 0.',
          'Weight seems too high':          lang === 'ms' ? 'Berat terlalu tinggi — sila semak semula.'       : 'Weight seems too high — please check.',
          'Photo is required':              lang === 'ms' ? 'Gambar diperlukan.'                              : 'Photo is required.',
        }
        const key = Object.keys(msgs).find(k => data.error?.startsWith(k))
        setError(key ? msgs[key] : (data.error ?? 'Something went wrong.'))
      }
    } catch {
      setError(lang === 'ms' ? 'Ralat rangkaian. Cuba lagi.' : 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <div className="bg-brand-green-pale border border-brand-green-light rounded-2xl p-8 text-center space-y-3 animate-success">
        <div className="text-6xl">⏳</div>
        <p className="text-brand-green text-5xl font-bold">+{result.pointsEarned}</p>
        <p className="text-brand-charcoal font-semibold text-lg">
          {lang === 'ms' ? 'Dihantar! Menunggu kelulusan' : 'Submitted! Pending approval'}
        </p>
        <p className="text-brand-muted text-sm">
          {lang === 'ms'
            ? 'Mata akan dikreditkan selepas ketua blok mengesahkan berat rasmi trak KDEB.'
            : 'Points will be credited once the committee verifies the official KDEB truck weight receipt.'}
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Link
            href={`/points/${qrCode}`}
            className="block w-full h-12 bg-brand-green text-white rounded-xl font-semibold text-sm flex items-center justify-center"
          >
            {lang === 'ms' ? 'Lihat Mata Saya' : 'View My Points'}
          </Link>
          <button
            type="button"
            onClick={() => { setResult(null); setCategory(''); setWeightKg(''); setPhoto(null) }}
            className="block w-full h-12 border-2 border-brand-green text-brand-green rounded-xl font-semibold text-sm"
          >
            {lang === 'ms' ? 'Hantar Lagi' : 'Submit Another'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category selector */}
      <div className="space-y-2">
        <p className="text-brand-charcoal text-base font-semibold">
          {lang === 'ms' ? 'Jenis Kitar Semula' : 'Recycling Category'}
        </p>
        <div className="space-y-2">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`w-full h-14 rounded-xl font-semibold text-base flex items-center px-4 gap-3 border-2 transition-colors ${
                category === c.key
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-green'
              }`}
            >
              <span className="text-2xl">{c.icon}</span>
              <span>{lang === 'ms' ? c.ms : c.en} / {lang === 'ms' ? c.en : c.ms}</span>
            </button>
          ))}
        </div>
      </div>

      <WeightInput value={weightKg} onChange={setWeightKg} lang={lang} />
      <PhotoUpload file={photo} onChange={setPhoto} lang={lang} />

      {error && (
        <div className="bg-brand-reject-bg border border-brand-reject rounded-xl p-4">
          <p className="text-brand-reject font-semibold text-sm">❌ {error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full h-14 bg-brand-green text-white rounded-xl font-bold text-base disabled:bg-brand-green-light disabled:text-brand-muted disabled:cursor-not-allowed transition-colors"
      >
        {loading
          ? (lang === 'ms' ? 'Menghantar…' : 'Submitting…')
          : (lang === 'ms' ? 'Hantar ♻️' : 'Submit ♻️')}
      </button>
    </form>
  )
}
