'use client'
import { useState } from 'react'

interface Props {
  qrCode: string
  lang: string
}

export default function PhoneRegister({ qrCode, lang }: Props) {
  const [phone, setPhone]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [saved, setSaved]       = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/household/register-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode, phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'invalid_phone') {
          setError(lang === 'ms' ? 'Format nombor tidak sah.' : 'Invalid phone number format.')
        } else if (data.error === 'phone_taken') {
          setError(lang === 'ms' ? 'Nombor ini sudah didaftarkan.' : 'This number is already registered.')
        } else {
          setError(lang === 'ms' ? 'Ralat. Cuba lagi.' : 'Something went wrong.')
        }
        return
      }
      setSaved(true)
    } catch {
      setError(lang === 'ms' ? 'Ralat. Cuba lagi.' : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="bg-brand-green-pale border border-brand-green rounded-2xl p-4 flex items-start gap-3">
        <span className="text-xl shrink-0">✅</span>
        <div>
          <p className="font-bold text-brand-green text-sm m-0">
            {lang === 'ms' ? 'Nombor berjaya disimpan!' : 'Phone number saved!'}
          </p>
          <p className="text-brand-muted text-xs m-0 mt-1">
            {lang === 'ms'
              ? 'Anda boleh log masuk dengan nombor telefon pada masa hadapan.'
              : 'You can now log in with your phone number next time.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-brand-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📱</span>
          <div>
            <p className="font-bold text-brand-charcoal text-sm m-0">
              {lang === 'ms' ? 'Simpan nombor telefon anda' : 'Save your phone number'}
            </p>
            <p className="text-brand-muted text-xs m-0 mt-[2px]">
              {lang === 'ms'
                ? 'Log masuk tanpa kad QR pada masa hadapan'
                : 'Skip the QR card on future visits'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-brand-muted text-lg leading-none hover:text-brand-charcoal transition-colors shrink-0 mt-[-2px]"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>

      <form onSubmit={handleSave} className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value); if (error) setError('') }}
          placeholder={lang === 'ms' ? 'cth. 0123456789' : 'e.g. 0123456789'}
          className={`flex-1 h-[44px] px-3 rounded-xl border text-sm text-brand-charcoal placeholder:text-brand-muted/50 focus:outline-none transition-colors ${
            error ? 'border-brand-reject' : 'border-brand-border focus:border-brand-green'
          }`}
        />
        <button
          type="submit"
          disabled={loading || !phone.trim()}
          className="h-[44px] px-4 bg-brand-green text-white text-sm font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-green-mid transition-colors shrink-0"
        >
          {loading ? '…' : (lang === 'ms' ? 'Simpan' : 'Save')}
        </button>
      </form>

      {error && (
        <p className="text-brand-reject text-xs font-semibold mt-2">✕ {error}</p>
      )}
    </div>
  )
}
