'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLang } from './LanguageProvider'

const NAV = [
  { id: 'about',     en: 'About',     ms: 'Tentang'  },
  { id: 'rewards',   en: 'Rewards',   ms: 'Hadiah'   },
  { id: 'locations', en: 'Locations', ms: 'Lokasi'   },
  { id: 'support',   en: 'Support',   ms: 'Sokongan' },
]

export default function Header() {
  const { lang, setLang } = useLang()
  const pathname   = usePathname()
  const router     = useRouter()
  const isHome     = pathname === '/'
  const [scrolled, setScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  function scrollTo(id: string) {
    if (!isHome) {
      router.push(id === 'top' ? '/' : `/#${id}`)
      return
    }
    if (id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-50 bg-green transition-shadow duration-300 ${
        scrolled ? 'shadow-[0_6px_24px_-14px_rgba(0,0,0,.55)]' : ''
      }`}
    >
      <div className="max-w-[1160px] mx-auto px-6 py-[14px] flex items-center gap-6">
        {/* Brand */}
        <button onClick={() => scrollTo('top')} className="flex items-center gap-[10px] text-white no-underline shrink-0 bg-transparent border-none cursor-pointer p-0">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-paper text-green grid place-items-center shrink-0">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 9 7h2v4h2V7h2l-3-5zm-7.5 9L2 16l1.8 3.1A2 2 0 0 0 5.5 20H9v-2H5.5l-1.2-2 1.5-2.6-1.3-2.4zm15 0-1.3 2.4 1.5 2.6-1.2 2H15v2h3.5a2 2 0 0 0 1.7-.9L22 16l-2.5-5z" />
            </svg>
          </span>
          <span className="font-display text-[1.32rem] tracking-[.01em]">
            Waste<span className="text-sun">2</span>Points
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden min-[721px]:flex gap-7 ml-[14px]">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => scrollTo(item.id)}
              className="text-[#EAF5EA]/90 hover:text-[#EAF5EA] font-semibold text-[.82rem] tracking-[.1em] uppercase transition-colors bg-transparent border-none cursor-pointer p-0"
            >
              {lang === 'ms' ? item.ms : item.en}
            </button>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-[14px]">
          {/* Language pill */}
          <div
            className="flex bg-white/15 rounded-full p-[3px]"
            role="group"
            aria-label="Language"
          >
            {(['en', 'ms'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`border-none font-bold text-[.76rem] px-[11px] py-[5px] rounded-full cursor-pointer transition-colors ${
                  lang === l ? 'bg-paper text-green' : 'bg-transparent text-[#EAF5EA]'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Scan now pill — desktop */}
          <button
            onClick={() => scrollTo('top')}
            className="hidden min-[721px]:inline-flex items-center bg-paper text-green font-bold text-[.92rem] px-5 py-[10px] rounded-full hover:bg-white hover:text-green-deep transition-colors whitespace-nowrap border-none cursor-pointer"
          >
            {lang === 'ms' ? 'Imbas sekarang' : 'Scan now'}
          </button>

          {/* Burger — mobile */}
          <button
            className="min-[721px]:hidden flex flex-col gap-1 bg-transparent border-none cursor-pointer p-2"
            aria-label="Menu"
            onClick={() => setMobileOpen(o => !o)}
          >
            <span className="block w-[22px] h-[2.5px] bg-white rounded-sm" />
            <span className="block w-[22px] h-[2.5px] bg-white rounded-sm" />
            <span className="block w-[22px] h-[2.5px] bg-white rounded-sm" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="min-[721px]:hidden flex flex-col bg-green-deep px-6 pb-[18px] pt-2">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => { scrollTo(item.id); setMobileOpen(false) }}
              className="text-[#EAF5EA] py-3 font-bold border-b border-white/10 uppercase tracking-[.08em] text-[.82rem] text-left bg-transparent border-none cursor-pointer"
            >
              {lang === 'ms' ? item.ms : item.en}
            </button>
          ))}
        </div>
      )}
    </header>
  )
}
