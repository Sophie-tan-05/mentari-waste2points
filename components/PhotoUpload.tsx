'use client'

import { useRef, useEffect, useState } from 'react'

interface Props {
  file: File | null
  onChange: (f: File | null) => void
  lang: string
}

export default function PhotoUpload({ file, onChange, lang }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.files?.[0] ?? null)
  }

  function handleRemove() {
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="block text-brand-charcoal text-base font-semibold">
        {lang === 'ms' ? 'Gambar / Photo' : 'Photo / Gambar'}
      </label>
      <p className="text-brand-muted text-sm">
        Pastikan penimbang dan barangan kelihatan / Make sure scale and items are visible
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full h-14 border-2 border-dashed border-brand-green text-brand-green rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-brand-green-pale transition-colors"
        >
          📷 {lang === 'ms' ? 'Ambil Gambar / Take Photo' : 'Take Photo / Ambil Gambar'}
        </button>
      ) : (
        <div className="relative rounded-xl overflow-hidden border-2 border-brand-green">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Scale photo preview" className="w-full object-cover max-h-64" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 bg-white rounded-full w-8 h-8 flex items-center justify-center text-brand-reject font-bold text-sm shadow"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
