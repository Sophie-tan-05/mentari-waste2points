'use client'

import { useLang } from './LanguageProvider'

export default function LanguageToggle() {
  const { lang, setLang } = useLang()

  return (
    <div className="flex items-center gap-1 text-sm font-semibold">
      <button
        onClick={() => setLang('en')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          lang === 'en'
            ? 'bg-white text-brand-green'
            : 'text-white/70 hover:text-white'
        }`}
      >
        EN
      </button>
      <span className="text-white/40">|</span>
      <button
        onClick={() => setLang('ms')}
        className={`px-2 py-1 rounded-lg transition-colors ${
          lang === 'ms'
            ? 'bg-white text-brand-green'
            : 'text-white/70 hover:text-white'
        }`}
      >
        BM
      </button>
    </div>
  )
}
