'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  lang: string
}

export default function QRInput({ lang }: Props) {
  const router = useRouter()
  const [tab, setTab]               = useState<'qr' | 'phone'>('qr')
  const [scanning, setScanning]     = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [phone, setPhone]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)

  useEffect(() => {
    return () => { scannerRef.current?.stop().catch(() => {}) }
  }, [])

  async function validateAndRedirect(qrCode: string) {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`/api/validate?qrCode=${encodeURIComponent(qrCode)}`)
      const data = await res.json()
      if (data.exists) {
        router.push(`/scan/${qrCode}`)
      } else {
        setError(
          lang === 'ms'
            ? 'QR tidak dijumpai. Hubungi ketua blok anda.'
            : 'QR not found. Contact your block leader.'
        )
      }
    } catch {
      setError(lang === 'ms' ? 'Ralat. Cuba lagi.' : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function startScanning() {
    setScanning(true)
    setError('')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-scanner-container')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decoded: string) => {
          scannerRef.current = null
          try { await scanner.stop() } catch { /* already stopped */ }
          setScanning(false)
          await validateAndRedirect(decoded.trim())
        },
        () => { /* per-frame errors are normal */ }
      )
    } catch {
      setScanning(false)
      setError(
        lang === 'ms'
          ? 'Kamera tidak dapat diakses. Sila masukkan kod secara manual.'
          : 'Camera not accessible. Please enter the code manually.'
      )
    }
  }

  async function stopScanning() {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch { /* already stopped */ }
      scannerRef.current = null
    }
    setScanning(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const code = manualCode.trim().toUpperCase()
    if (!code) return
    await validateAndRedirect(code)
  }

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = phone.trim().replace(/\s|-/g, '')
    if (!cleaned) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/login?phone=${encodeURIComponent(cleaned)}`)
      if (res.status === 404) {
        setError(
          lang === 'ms'
            ? 'Nombor tidak dijumpai. Sila log masuk dengan kod QR dahulu.'
            : 'Number not found. Please log in with your QR code first.'
        )
        return
      }
      const data = await res.json()
      router.push(`/scan/${data.qrCode}`)
    } catch {
      setError(lang === 'ms' ? 'Ralat. Cuba lagi.' : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function switchTab(next: 'qr' | 'phone') {
    setTab(next)
    setError('')
    stopScanning()
  }

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Tab switcher */}
      <div className="flex rounded-[12px] border border-[#C8E6C9] overflow-hidden bg-green-pale p-[3px] gap-[3px]">
        <button
          type="button"
          onClick={() => switchTab('qr')}
          className={`flex-1 h-[40px] rounded-[9px] font-bold text-[.85rem] flex items-center justify-center gap-[6px] transition-all ${
            tab === 'qr'
              ? 'bg-white text-green shadow-sm'
              : 'text-muted hover:text-green'
          }`}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h5v2h-5v-2z"/>
          </svg>
          {lang === 'ms' ? 'Kod QR' : 'QR Code'}
        </button>
        <button
          type="button"
          onClick={() => switchTab('phone')}
          className={`flex-1 h-[40px] rounded-[9px] font-bold text-[.85rem] flex items-center justify-center gap-[6px] transition-all ${
            tab === 'phone'
              ? 'bg-white text-green shadow-sm'
              : 'text-muted hover:text-green'
          }`}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"/>
          </svg>
          {lang === 'ms' ? 'No. Telefon' : 'Phone Number'}
        </button>
      </div>
      {/* ── QR tab ─────────────────────────────── */}
      {tab === 'qr' && (
        <>
          {/* Camera / viewfinder */}
          {!scanning ? (
            <button
              onClick={startScanning}
              disabled={loading}
              className="w-full h-[54px] rounded-[15px] border border-[#C8E6C9] bg-green-pale text-green font-bold text-base flex items-center justify-center gap-[9px] hover:bg-[#ddf0de] transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9zm3 5a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
              </svg>
              {lang === 'ms' ? 'Buka kamera' : 'Open camera'}
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative rounded-[16px] overflow-hidden border border-[#C8E6C9]">
                <div
                  id="qr-scanner-container"
                  className="w-full"
                  style={{ minHeight: 188, background: 'radial-gradient(circle at 50% 40%, #2a2a2a, #0e0e0e)' }}
                />
              </div>
              <button
                onClick={stopScanning}
                className="w-full h-[46px] rounded-[15px] border border-[#C8E6C9] bg-transparent text-green font-bold text-[.92rem] hover:bg-green-pale transition-colors cursor-pointer"
              >
                {lang === 'ms' ? 'Hentikan imbasan' : 'Stop scanning'}
              </button>
            </div>
          )}

          {/* OR divider */}
          <div className="flex items-center gap-3 text-muted">
            <span className="flex-1 h-px bg-[#C8E6C9]" />
            <em className="not-italic text-[.84rem] font-semibold">{lang === 'ms' ? 'atau' : 'or'}</em>
            <span className="flex-1 h-px bg-[#C8E6C9]" />
          </div>

          {/* Manual QR input */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <input
          type="text"
          value={manualCode}
          onChange={e => {
            setManualCode(e.target.value.toUpperCase())
            if (error) setError('')
          }}
          placeholder={lang === 'ms' ? 'Masukkan kod (cth. DM-8-001)' : 'Enter code (e.g. DM-8-001)'}
          className={`w-full h-[54px] px-4 rounded-[15px] border text-ink text-base tracking-[.04em] placeholder:text-muted/50 focus:outline-none transition-colors ${
            error
              ? 'border-[#C62828]'
              : 'border-[#C8E6C9] focus:border-green'
          }`}
          style={{ background: '#fff' }}
        />
        <button
          type="submit"
          disabled={loading || !manualCode.trim()}
          className="w-full h-[54px] rounded-[15px] bg-green text-white font-bold text-base flex items-center justify-center gap-[9px] hover:bg-green-deep disabled:bg-green-pale disabled:text-muted disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {loading ? (
            lang === 'ms' ? 'Menyemak…' : 'Checking…'
          ) : (
            <>
              {lang === 'ms' ? 'Teruskan' : 'Continue'}
              {!loading && (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 12h12.2l-4.6-4.6L14 6l7 7-7 7-1.4-1.4 4.6-4.6H5z" />
                </svg>
              )}
            </>
          )}
        </button>
        </form>

        {/* QR tab error / hint */}
        {error ? (
          <p className="text-[.85rem] text-center font-bold text-[#C62828]">✕ {error}</p>
        ) : (
          <p className="text-[.85rem] text-center text-muted">
            {lang === 'ms' ? 'Cuba kod seperti DM-8-001' : 'Try a code like DM-8-001'}
          </p>
        )}
        </>
      )}

      {/* ── Phone tab ──────────────────────────── */}
      {tab === 'phone' && (
        <>
          <p className="text-[.84rem] text-muted text-center leading-snug">
            {lang === 'ms'
              ? 'Masukkan nombor telefon yang telah didaftarkan dengan kod QR anda.'
              : 'Enter the phone number you registered with your QR code.'}
          </p>

          <form onSubmit={handlePhoneLogin} className="flex flex-col gap-[14px]">
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); if (error) setError('') }}
              placeholder={lang === 'ms' ? 'cth. 0123456789' : 'e.g. 0123456789'}
              className={`w-full h-[54px] px-4 rounded-[15px] border text-ink text-base tracking-[.04em] placeholder:text-muted/50 focus:outline-none transition-colors ${
                error ? 'border-[#C62828]' : 'border-[#C8E6C9] focus:border-green'
              }`}
              style={{ background: '#fff' }}
            />
            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full h-[54px] rounded-[15px] bg-green text-white font-bold text-base flex items-center justify-center gap-[9px] hover:bg-green-deep disabled:bg-green-pale disabled:text-muted disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? (lang === 'ms' ? 'Menyemak…' : 'Checking…') : (
                <>
                  {lang === 'ms' ? 'Log Masuk' : 'Log In'}
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M5 12h12.2l-4.6-4.6L14 6l7 7-7 7-1.4-1.4 4.6-4.6H5z" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {error ? (
            <p className="text-[.85rem] text-center font-bold text-[#C62828]">✕ {error}</p>
          ) : (
            <p className="text-[.85rem] text-center text-muted">
              {lang === 'ms'
                ? 'Kali pertama? Gunakan kod QR dahulu.'
                : 'First time? Use your QR code tab first.'}
            </p>
          )}
        </>
      )}
    </div>
  )
}
