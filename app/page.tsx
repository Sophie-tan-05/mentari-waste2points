'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useLang } from '@/components/LanguageProvider'
import QRInput from '@/components/QRInput'
import { REWARDS } from '@/lib/rewards'
import { t } from '@/lib/lang'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

/* ─────────────────────────────────────────────
   SVG / Decoration primitives
───────────────────────────────────────────── */

function starburstPoints(spikes: number, depth: number) {
  const cx = 50, cy = 50, outer = 50, inner = outer * (1 - depth)
  const pts: string[] = []
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / spikes) * i - Math.PI / 2
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

function Starburst({
  size = 120, color = '#F0609E', spikes = 16, depth = 0.46,
  className = '', style = {},
}: {
  size?: number; color?: string; spikes?: number; depth?: number;
  className?: string; style?: React.CSSProperties
}) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 100 100"
      className={className} style={style} aria-hidden="true"
    >
      <polygon points={starburstPoints(spikes, depth)} fill={color} />
    </svg>
  )
}

function TornEdge({ color = '#59AE4F', height = 84 }: { color?: string; height?: number }) {
  const path = 'M0,38 C40,8 70,52 120,30 C170,10 210,54 270,32 C330,12 370,58 430,34 C500,8 540,56 600,30 C660,8 710,50 770,30 C840,8 880,52 940,32 C1000,12 1040,50 1100,34 C1160,16 1200,46 1260,32 C1320,18 1380,46 1440,34 L1440,200 L0,200 Z'
  return (
    <div className="relative w-full leading-[0] mb-[-2px] z-[2]" style={{ height }} aria-hidden="true">
      <svg viewBox="0 0 1440 200" preserveAspectRatio="none" width="100%" height="100%">
        <path d={path} fill={color} />
      </svg>
    </div>
  )
}

function PhotoSlot({ label, rounded = 0 }: { label: string; rounded?: number }) {
  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        borderRadius: rounded,
        background: 'linear-gradient(135deg, #3a3a3a, #1c1c1c 60%, #2c2c2c)',
      }}
    >
      {/* grain */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* rubble highlights */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          background:
            'radial-gradient(60px 40px at 12% 78%, rgba(255,255,255,.22), transparent 70%), ' +
            'radial-gradient(80px 50px at 38% 92%, rgba(255,255,255,.14), transparent 70%), ' +
            'radial-gradient(70px 46px at 66% 80%, rgba(255,255,255,.20), transparent 70%), ' +
            'radial-gradient(90px 60px at 88% 95%, rgba(255,255,255,.12), transparent 70%), ' +
            'repeating-linear-gradient(115deg, rgba(0,0,0,.35) 0 14px, rgba(255,255,255,.05) 14px 30px)',
          mixBlendMode: 'screen',
        }}
      />
      <span
        className="absolute left-4 bottom-[14px] z-[2] text-white/78 bg-black/40 backdrop-blur-sm px-[10px] py-[5px] rounded-[6px] font-bold text-[.72rem] uppercase tracking-[.1em]"
      >
        {label}
      </span>
    </div>
  )
}

const ICON_PATHS: Record<string, string> = {
  qr:      'M3 3h7v7H3V3zm2 2v3h3V5H5zm9-2h7v7h-7V3zm2 2v3h3V5h-3zM3 14h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h2v2h-2v-2zm3 0h2v2h-2v-2zm-3 3h5v2h-5v-2z',
  camera:  'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19 3h-2.4l-1.5-2H8.9L7.4 3H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  play:    'M8 5v14l11-7z',
  scale:   'M12 3a2 2 0 0 1 1.94 1.5H20v2h-2.26l2.2 5.5a3.5 3.5 0 1 1-6.88 0L15.26 6.5H13v12h4v2H7v-2h4v-12H8.74l2.2 5.5a3.5 3.5 0 1 1-6.88 0L6.26 6.5H4v-2h6.06A2 2 0 0 1 12 3z',
  coin:    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm.9 3h-1.8v1.1c-1.2.2-2 1-2 2.1 0 1.3 1 1.9 2.3 2.2 1 .2 1.3.5 1.3.9 0 .4-.4.7-1 .7-.8 0-1.3-.4-1.4-1H7.5c.1 1.1.9 1.9 2.1 2.1V18h1.8v-1.1c1.3-.2 2.1-1 2.1-2.2 0-1.3-.9-1.9-2.4-2.2-.9-.2-1.2-.4-1.2-.8s.3-.6.9-.6c.7 0 1.1.3 1.2.9h1.8c-.1-1-.8-1.8-1.9-2V7z',
  recycle: 'M12 2 9 7h2v4h2V7h2l-3-5zm-7.5 9L2 16l1.8 3.1A2 2 0 0 0 5.5 20H9v-2H5.5l-1.2-2 1.5-2.6-1.3-2.4zm15 0-1.3 2.4 1.5 2.6-1.2 2H15v2h3.5a2 2 0 0 0 1.7-.9L22 16l-2.5-5z',
  pin:     'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z',
  check:   'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z',
  gift:    'M20 7h-2.2A3 3 0 0 0 12 3.6 3 3 0 0 0 6.2 7H4a1 1 0 0 0-1 1v3h9V8h-1.6a1 1 0 1 1 0-2H12V7zm-7 4h9V8a1 1 0 0 0-1-1h-2.2a3 3 0 0 0-.8-.2H13v4zM4 13v7a1 1 0 0 0 1 1h6v-8H4zm9 8h6a1 1 0 0 0 1-1v-7h-7v8z',
  arrow:   'M5 12h12.2l-4.6-4.6L14 6l7 7-7 7-1.4-1.4 4.6-4.6H5z',
  leaf:    'M5 21c0-7 5-12 14-13 0 9-5 13-11 13H5zm3-2c4-1 6-3.5 7-7-3.5 1.5-6 4-7 7z',
}

function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={ICON_PATHS[name] ?? ICON_PATHS.recycle} />
    </svg>
  )
}

function Kicker({ children, color = '#EE8A3B' }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 font-bold text-[.78rem] uppercase tracking-[.13em] mb-[18px]"
      style={{ color }}
    >
      <Starburst size={16} color={color} spikes={10} depth={0.5} />
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────
   Data
───────────────────────────────────────────── */

const STEPS = [
  {
    n: '01', icon: 'scale',
    en: { title: 'Weigh your recyclables', body: 'Place your clean plastics, paper, cans or glass on the scale and take note of the weight shown on the display.' },
    ms: { title: 'Timbang bahan kitar semula', body: 'Letakkan plastik, kertas, tin atau kaca yang bersih di atas penimbang dan catat berat yang ditunjukkan.' },
  },
  {
    n: '02', icon: 'camera',
    en: { title: 'Photograph your items on the scale', body: 'Take a clear, well-lit photo of your recyclables on the scale — make sure the weight reading on the display is fully visible in the frame.' },
    ms: { title: 'Gambar bahan di atas penimbang', body: 'Ambil gambar yang jelas dan terang bagi bahan kitar semula di atas penimbang — pastikan bacaan berat pada paparan kelihatan sepenuhnya dalam gambar.' },
  },
  {
    n: '03', icon: 'qr',
    en: { title: 'Scan your QR card from home', body: 'Your QR card is issued to your unit — scan it at home using your phone camera for a faster, more reliable connection.' },
    ms: { title: 'Imbas kad QR dari rumah', body: 'Kad QR anda ditetapkan untuk unit anda — imbas di rumah menggunakan kamera telefon untuk sambungan yang lebih pantas dan stabil.' },
  },
  {
    n: '04', icon: 'coin',
    en: { title: 'Earn points instantly', body: 'Points are credited to your card the moment your submission is received. No waiting — your rewards start right away.' },
    ms: { title: 'Dapat mata serta-merta', body: 'Mata dikreditkan ke kad anda sebaik sahaja penghantaran diterima. Tiada menunggu — ganjaran anda bermula serta-merta.' },
  },
]

const STATS = [
  { value: '18,420',  suffix: 'kg',  en: 'Recyclables collected', ms: 'Bahan dikumpul'    },
  { value: '184,200', suffix: 'pts', en: 'Points awarded',        ms: 'Mata diberi'        },
  { value: '1,260',   suffix: '',    en: 'Households joined',     ms: 'Isi rumah sertai'   },
  { value: '12',      suffix: '',    en: 'Drop-off points',       ms: 'Pusat kutipan'      },
]

const LOCATIONS = [
  { lat: 3.0895, lon: 101.6370, address: 'Jalan PJS 5/4, Taman Desa Mentari, 46150 Petaling Jaya, Selangor',                                                        en: { name: 'Desa Mentari Blok 8 Community Hall', hours: 'Mon–Sat · 8am–12pm', tag: 'Main Hub'  }, ms: { name: 'Dewan Komuniti Desa Mentari Blok 8', hours: 'Isn–Sab · 8pg–12tgh',   tag: 'Hub Utama'   } },
  { lat: 3.0880, lon: 101.6378, address: '13-1, Jalan PJS 6/5F, Taman Desa Mentari, 46000 Petaling Jaya, Selangor',                                                  en: { name: 'KK Super Mart Desa Mentari',         hours: 'Daily · 8am–10pm',   tag: 'Drop-off'  }, ms: { name: 'KK Super Mart Desa Mentari',          hours: 'Setiap hari · 8pg–10mlm', tag: 'Titik kutip' } },
  { lat: 3.0874, lon: 101.6383, address: 'Jalan PJS 6/6B, PJS 6, 46150 Petaling Jaya, Selangor',                                                                     en: { name: '99 Speedmart Desa Mentari',           hours: 'Daily · 7am–11pm',   tag: 'Drop-off'  }, ms: { name: '99 Speedmart Desa Mentari',            hours: 'Setiap hari · 7pg–11mlm', tag: 'Titik kutip' } },
  { lat: 3.0910, lon: 101.6395, address: 'No.27 & 29 (Ground Floor), Blok A, Dataran Mentari, Jalan PJS 8/12, Dataran Mentari, 46150 Petaling Jaya, Selangor',       en: { name: 'ECONSAVE Mart Dataran Mentari',       hours: 'Daily · 9am–9pm',    tag: 'Drop-off'  }, ms: { name: 'ECONSAVE Mart Dataran Mentari',        hours: 'Setiap hari · 9pg–9mlm',  tag: 'Titik kutip' } },
]

const ACCEPTED = [
  { en: 'Clean plastics',    ms: 'Plastik bersih'    },
  { en: 'Paper & card',      ms: 'Kertas & kadbod'   },
  { en: 'Aluminium cans',    ms: 'Tin aluminium'     },
  { en: 'Glass bottles',     ms: 'Botol kaca'        },
]

const TESTIMONIALS = [
  {
    en: { quote: 'I used to throw it all away. Now my daughter sorts the bottles and we redeem rice every month.', name: 'Puan Aminah', role: 'Blok B · 3 months in' },
    ms: { quote: 'Dulu saya buang semua. Sekarang anak saya asingkan botol dan kami tebus beras setiap bulan.',   name: 'Puan Aminah', role: 'Blok B · 3 bulan'     },
  },
  {
    en: { quote: 'The double points at launch got my whole floor recycling. We cleared the corridor in a week.',   name: 'Encik Raj',   role: 'Blok E · Block leader' },
    ms: { quote: 'Mata berganda masa pelancaran buat satu tingkat saya kitar semula. Koridor bersih dalam seminggu.', name: 'Encik Raj', role: 'Blok E · Ketua blok' },
  },
  {
    en: { quote: 'Weighing it in front of me is what won my trust. The points always match.',                     name: 'Mei Ling',    role: 'Taman Sri Indah'       },
    ms: { quote: 'Timbang di depan saya yang buat saya percaya. Mata sentiasa tepat.',                           name: 'Mei Ling',    role: 'Taman Sri Indah'       },
  },
]

const FAQ_ITEMS = [
  {
    en: { q: 'What can I bring to recycle?',  a: 'Clean, dry plastics, paper and cardboard, aluminium cans and glass bottles. Please rinse food containers first.' },
    ms: { q: 'Apa yang boleh saya bawa?',     a: 'Plastik, kertas dan kadbod, tin aluminium dan botol kaca yang bersih dan kering. Bilas bekas makanan dahulu.' },
  },
  {
    en: { q: 'How are points calculated?',    a: 'You earn 10 points per kilogram, weighed on the spot. The first 50 scans community-wide earn double points.' },
    ms: { q: 'Bagaimana mata dikira?',        a: 'Anda dapat 10 mata setiap kilogram, ditimbang di tempat. 50 imbasan pertama dapat mata berganda.' },
  },
  {
    en: { q: 'How do I get a QR card?',       a: "Each household is issued one card per unit. If you don't have yours yet, contact your block leader." },
    ms: { q: 'Bagaimana dapat kad QR?',       a: 'Setiap isi rumah diberi satu kad per unit. Jika belum ada, hubungi ketua blok anda.' },
  },
  {
    en: { q: 'When can I redeem rewards?',    a: 'Anytime you have enough points. Choose your item on your card and collect it at the community hall.' },
    ms: { q: 'Bila boleh tebus hadiah?',      a: 'Bila-bila masa anda cukup mata. Pilih barang pada kad anda dan ambil di dewan komuniti.' },
  },
]

/* ─────────────────────────────────────────────
   Shared section header
───────────────────────────────────────────── */

function SectionHead({
  kicker, title, sub, center, kickColor,
}: {
  kicker: string; title: string; sub?: string;
  center?: boolean; kickColor?: string
}) {
  return (
    <div className={`mb-12 ${center ? 'text-center' : 'max-w-[640px]'}`}>
      <Kicker color={kickColor}>{kicker}</Kicker>
      <h2
        className="font-display m-0 leading-[1.02] tracking-[-0.01em]"
        style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}
      >
        {title}
      </h2>
      {sub && (
        <p className={`text-muted text-[1.12rem] mt-4 max-w-[52ch] ${center ? 'mx-auto' : ''}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Sections
───────────────────────────────────────────── */

function HeroSection({ lang }: { lang: string }) {
  return (
    <section className="relative overflow-hidden" id="top" style={{ paddingTop: 64 }}>
      {/* Decorations */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <Starburst
          size={92} color="#F4C24B" spikes={18} depth={0.55}
          style={{ position: 'absolute', top: 92, left: '46%' }}
        />
        <Starburst
          size={150} color="#F0609E" spikes={20} depth={0.6}
          style={{ position: 'absolute', top: 150, right: -34 }}
        />
      </div>

      {/* 2-col grid */}
      <div
        className="relative z-[3] max-w-[1160px] mx-auto px-6 py-12 pb-10 grid gap-14 items-center"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))' }}
      >
        {/* Copy */}
        <div>
          <Kicker color="#EE8A3B">
            {t('Recycle · Earn · Redeem', 'Kitar · Kumpul · Tebus', lang)}
          </Kicker>
          <h1 className="flex flex-col gap-0.5 mb-6 m-0">
            <span
              className="font-display text-ink"
              style={{ fontSize: 'clamp(1.6rem,3vw,2.4rem)' }}
            >
              {t("Let's join the", 'Sertai', lang)}
            </span>
            <span
              className="font-display leading-[.95] tracking-[-0.015em]"
              style={{ fontSize: 'clamp(3.6rem,9.5vw,7rem)' }}
            >
              <span className="text-green">{t('Recycling', 'Revolusi', lang)}</span>{' '}
              <span className="text-ink">{t('Revolution', 'Kitar Semula', lang)}</span>
            </span>
          </h1>
          <p className="text-muted text-xl max-w-[40ch] m-0">
            {t(
              'Bring your recyclables, weigh them in, and turn everyday waste into real groceries for your family.',
              'Bawa bahan kitar semula, timbang, dan tukar sampah harian kepada barangan dapur untuk keluarga anda.',
              lang
            )}
          </p>
          <p className="mt-[22px] inline-flex items-center gap-2 font-bold text-[.92rem] text-green m-0">
            <Icon name="check" size={16} />
            {t('No app to install · Works on any phone', 'Tiada aplikasi · Berfungsi pada mana-mana telefon', lang)}
          </p>
        </div>

        {/* Scan card */}
        <div className="max-w-[460px] min-[941px]:max-w-none">
          <div className="bg-white rounded-[26px] p-[26px] border-[2.5px] border-ink shadow-[8px_8px_0_#1B2E1C]">
            <div className="flex gap-[14px] items-start mb-5">
              <span className="shrink-0 inline-flex items-center gap-1 bg-green-pale text-green font-bold text-[.72rem] px-[10px] py-[6px] rounded-[10px] mt-0.5">
                <Icon name="qr" size={15} /> QR
              </span>
              <div>
                <h3 className="font-display text-2xl leading-[1.1] m-0">
                  {t('Scan your QR card', 'Imbas kad QR anda', lang)}
                </h3>
                <p className="text-muted text-[.94rem] mt-1 m-0">
                  {t('Use your camera or type the code on your card.', 'Guna kamera atau taip kod pada kad anda.', lang)}
                </p>
              </div>
            </div>
            <QRInput lang={lang} />
          </div>
        </div>
      </div>

      {/* Torn band + hero photo */}
      <div className="relative mt-[18px]">
        <TornEdge color="#59AE4F" height={84} />
        <div className="w-full py-12 px-6 flex justify-center" style={{ backgroundColor: '#2E7D32' }}>
          <div className="w-full max-w-3xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lang === 'ms' ? '/media/images/BM1.png' : '/media/images/English1.png'}
              alt="Recycling waste"
              className="w-full h-auto block"
              style={{
                mixBlendMode: 'lighten',
                filter: lang === 'ms' ? 'none' : 'contrast(2.2) brightness(1.15)',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection({ lang }: { lang: string }) {
  return (
    <section className="max-w-[1160px] mx-auto px-6 py-24 max-[720px]:py-16" id="about">
      <SectionHead
        kicker={t('How it works', 'Cara ia berfungsi', lang)}
        title={t('Four steps to your first reward', 'Empat langkah ke hadiah pertama', lang)}
        kickColor="#F0609E"
        center
      />
      <div className="grid gap-10 min-[941px]:grid-cols-2 items-start">

        {/* Steps list */}
        <div className="flex flex-col gap-4">
          {STEPS.map(step => {
            const copy = lang === 'ms' ? step.ms : step.en
            return (
              <article
                key={step.n}
                className="bg-white rounded-[20px] p-[22px] border-[2.5px] border-ink shadow-[4px_4px_0_#1B2E1C] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_#1B2E1C] transition-all duration-200 flex items-start gap-4"
              >
                <span className="grid place-items-center w-12 h-12 rounded-[14px] bg-green-pale text-green shrink-0 mt-0.5">
                  <Icon name={step.icon} size={22} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[.68rem] text-muted uppercase tracking-[.12em]">{step.n}</span>
                  </div>
                  <h3 className="font-display text-[1.18rem] leading-[1.2] mb-[6px] m-0">{copy.title}</h3>
                  <p className="text-muted text-[.9rem] leading-[1.5] m-0">{copy.body}</p>
                </div>
              </article>
            )
          })}
        </div>

        {/* Video slot */}
        <div className="min-[941px]:sticky min-[941px]:top-24">
          <div className="rounded-[20px] overflow-hidden border-[2.5px] border-ink shadow-[5px_5px_0_#1B2E1C] bg-black aspect-video relative group">
            <video
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
              src="/media/videos/how-it-works.mp4"
              onClick={e => {
                const v = e.currentTarget
                if (document.fullscreenElement) document.exitFullscreen()
                else v.requestFullscreen()
              }}
            />
            {/* Fullscreen hint — fades in on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <span className="bg-black/50 text-white text-xs font-semibold px-3 py-1.5 rounded-lg backdrop-blur-sm">
                {t('Click to fullscreen', 'Klik untuk skrin penuh', lang)}
              </span>
            </div>
          </div>
          <p className="text-muted text-sm text-center mt-3 font-semibold">
            {t('Watch how it works', 'Tonton cara ia berfungsi', lang)}
          </p>
        </div>

      </div>
    </section>
  )
}

function RewardsSection({ lang }: { lang: string }) {
  return (
    <section className="max-w-[1160px] mx-auto px-6 pb-24 max-[720px]:pb-16" id="rewards">
      <SectionHead
        kicker={t('Rewards', 'Hadiah', lang)}
        title={t('Real groceries, not gimmicks', 'Barangan dapur sebenar', lang)}
        sub={t(
          'Redeem points for everyday essentials at the community hall.',
          'Tebus mata untuk barang keperluan harian di dewan komuniti.',
          lang
        )}
        kickColor="#EE8A3B"
      />
      <div className="grid gap-4 grid-cols-2 min-[720px]:grid-cols-3 min-[941px]:grid-cols-5">
        {REWARDS.map(r => (
          <article
            key={r.key}
            className="relative bg-white rounded-[18px] p-[18px] pt-[18px] flex flex-col gap-[10px] border-[2.5px] border-ink shadow-[5px_5px_0_#1B2E1C] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[7px_7px_0_#1B2E1C] transition-all duration-200"
          >
            <span className="grid place-items-center w-[42px] h-[42px] rounded-[12px] bg-green-pale text-green shrink-0">
              <Icon name="gift" size={22} />
            </span>
            <span className="absolute top-[14px] right-[14px] bg-ink text-sun font-bold text-[.92rem] px-[10px] py-1 rounded-[8px]">
              {r.points} <small className="font-bold text-[.68rem] opacity-85">{lang === 'ms' ? 'mata' : 'pts'}</small>
            </span>
            <p className="font-bold text-[.92rem] leading-[1.25] text-ink m-0 mt-1">
              {lang === 'ms' ? r.labelMs : r.label}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function ImpactSection({ lang }: { lang: string }) {
  return (
    <section className="relative bg-green text-paper overflow-hidden my-10 py-[84px] px-6">
      {/* Starbursts */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <Starburst
          size={120} color="#F4C24B" spikes={18} depth={0.55}
          style={{ position: 'absolute', top: -30, right: '6%', opacity: 0.9 }}
        />
      </div>

      <div className="relative z-[2] max-w-[720px] mx-auto text-center mb-12">
        <Kicker color="#F4C24B">{t('Our impact', 'Impak kami', lang)}</Kicker>
        <h2
          className="font-display text-paper leading-[1.02] tracking-[-0.01em] m-0"
          style={{ fontSize: 'clamp(2.4rem,5vw,4rem)' }}
        >
          {t('What the neighbourhood has done together', 'Apa yang dicapai bersama', lang)}
        </h2>
      </div>

      <div className="relative z-[2] max-w-[1160px] mx-auto grid grid-cols-2 min-[941px]:grid-cols-4 gap-6">
        {STATS.map((s, i) => (
          <div key={i} className="text-center py-[14px]">
            <div
              className="font-display leading-none text-paper"
              style={{ fontSize: 'clamp(2.6rem,5.5vw,4.2rem)' }}
            >
              {s.value}
              {s.suffix && (
                <span className="text-sun ml-1" style={{ fontSize: '0.42em' }}>{s.suffix}</span>
              )}
            </div>
            <div className="mt-3 text-[#cfe6cf] font-semibold text-[.96rem]">
              {lang === 'ms' ? s.ms : s.en}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function LocationsSection({ lang }: { lang: string }) {
  return (
    <section className="max-w-[1160px] mx-auto px-6 py-24 max-[720px]:py-16" id="locations">
      <SectionHead
        kicker={t('Drop-off points', 'Pusat kutipan', lang)}
        title={t('Find your nearest collection point', 'Cari pusat kutipan berdekatan', lang)}
        kickColor="#EE8A3B"
      />
      <div className="grid gap-10 max-[940px]:grid-cols-1 min-[941px]:grid-cols-2 items-start mt-10">
        {/* Left: list */}
        <div>
          <ul className="list-none m-0 p-0 flex flex-col gap-3">
            {LOCATIONS.map((l, i) => {
              const loc = lang === 'ms' ? l.ms : l.en
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.address)}`
              return (
                <li
                  key={i}
                  className="group flex items-start gap-4 bg-white border-[2.5px] border-ink rounded-[16px] px-[18px] py-4 shadow-[5px_5px_0_#1B2E1C] hover:shadow-[7px_7px_0_#1B2E1C] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-brand-green-pale transition-all duration-200 cursor-pointer"
                >
                  <span className="grid place-items-center w-[36px] h-[36px] rounded-full bg-brand-green text-white font-bold text-[.9rem] shrink-0 mt-[2px] group-hover:scale-110 transition-transform duration-200">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base m-0 leading-snug text-brand-charcoal">{loc.name}</p>
                    <p className="text-muted text-[.82rem] m-0 mt-[2px]">{loc.hours}</p>
                    <p className="text-muted text-[.75rem] m-0 mt-[2px] leading-snug">{l.address}</p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-[8px] bg-brand-green text-white font-semibold text-[.72rem] px-[10px] py-[4px] rounded-[6px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-brand-green-mid"
                      onClick={e => e.stopPropagation()}
                    >
                      🗺️ {t('Get directions', 'Dapatkan arah', lang)}
                    </a>
                  </div>
                  <span className="bg-brand-green-pale text-brand-green font-bold text-[.72rem] px-[10px] py-[4px] rounded-[8px] shrink-0 mt-[2px] group-hover:bg-brand-green group-hover:text-white transition-colors duration-200">
                    {loc.tag}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Right: map + accepted */}
        <div className="flex flex-col gap-[22px]">
          {/* Leaflet map card */}
          <div className="rounded-[20px] overflow-hidden border-[2.5px] border-ink shadow-[5px_5px_0_#1B2E1C] bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-brand-green-pale border-b-[2px] border-ink">
              <span className="text-lg">📍</span>
              <p className="font-bold text-[.9rem] text-brand-charcoal m-0">
                {t('4 Drop-off Points · Desa Mentari', '4 Titik Kutipan · Desa Mentari', lang)}
              </p>
            </div>
            {/* Map — isolation:isolate traps Leaflet z-indexes inside this stacking context */}
            <div style={{ height: 360, isolation: 'isolate' }}>
              <MapView
                locations={LOCATIONS.map((l, i) => ({
                  lat: l.lat,
                  lon: l.lon,
                  name: lang === 'ms' ? l.ms.name : l.en.name,
                  address: l.address,
                  tag: lang === 'ms' ? l.ms.tag : l.en.tag,
                }))}
                center={[3.0888, 101.6380]}
                zoom={16}
              />
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t-[2px] border-ink bg-brand-green-pale">
              {LOCATIONS.map((l, i) => (
                <span key={i} className="flex items-center gap-1 text-[.72rem] font-semibold text-brand-charcoal">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-green text-white font-bold text-[.65rem]">{i + 1}</span>
                  {lang === 'ms' ? l.ms.name : l.en.name}
                </span>
              ))}
            </div>
          </div>

          {/* Accepted materials */}
          <div>
            <p className="font-display text-[1.3rem] mb-[14px] m-0">
              {t('What we accept', 'Apa yang diterima', lang)}
            </p>
            <div className="flex flex-wrap gap-[10px]">
              {ACCEPTED.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-[6px] bg-white border-[2.5px] border-ink text-green font-bold text-[.9rem] px-[14px] py-2 rounded-[8px] hover:bg-brand-green hover:text-white hover:border-brand-green hover:shadow-[3px_3px_0_#1B2E1C] hover:-translate-y-[2px] transition-all duration-200 cursor-default"
                >
                  <Icon name="check" size={14} />
                  {lang === 'ms' ? a.ms : a.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TestimonialsSection({ lang }: { lang: string }) {
  return (
    <section className="max-w-[1160px] mx-auto px-6 py-24 max-[720px]:py-16">
      <SectionHead
        kicker={t('From your neighbours', 'Daripada jiran', lang)}
        title={t('Voices from the blocks', 'Suara dari blok', lang)}
        kickColor="#F0609E"
        center
      />
      <div className="grid gap-[22px] max-[940px]:grid-cols-1 min-[941px]:grid-cols-3 max-[940px]:max-w-[540px] max-[940px]:mx-auto">
        {TESTIMONIALS.map((item, i) => {
          const copy = lang === 'ms' ? item.ms : item.en
          return (
            <figure
              key={i}
              className="relative bg-white border-[2.5px] border-ink shadow-[5px_5px_0_#1B2E1C] rounded-[22px] p-[30px] m-0"
            >
              <span
                className="absolute top-2 right-[22px] font-display text-[5rem] text-paper-2 leading-none select-none"
                aria-hidden="true"
              >
                &ldquo;
              </span>
              <blockquote className="m-0 mb-[22px] text-[1.12rem] leading-[1.5] text-ink relative z-[1]">
                {copy.quote}
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <span className="grid place-items-center w-[42px] h-[42px] rounded-full bg-green-pale text-green shrink-0">
                  <Icon name="leaf" size={18} />
                </span>
                <span>
                  <strong className="block font-bold text-[.96rem]">{copy.name}</strong>
                  <em className="not-italic text-muted text-[.84rem]">{copy.role}</em>
                </span>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </section>
  )
}

function FAQSection({ lang }: { lang: string }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <section className="max-w-[1160px] mx-auto px-6 py-24 max-[720px]:py-16" id="support">
      <SectionHead
        kicker={t('Support', 'Sokongan', lang)}
        title={t('Questions, answered', 'Soalan, dijawab', lang)}
        kickColor="#EE8A3B"
        center
      />
      <div className="max-w-[760px] mx-auto flex flex-col gap-3">
        {FAQ_ITEMS.map((item, i) => {
          const copy   = lang === 'ms' ? item.ms : item.en
          const isOpen = openIndex === i
          return (
            <div
              key={i}
              className="bg-white border-[2px] border-ink shadow-[3px_3px_0_#1B2E1C] rounded-[16px] overflow-hidden"
            >
              <button
                className="w-full bg-transparent border-none cursor-pointer text-left flex items-center justify-between gap-4 px-[22px] py-5 font-display text-[1.18rem] text-ink"
                onClick={() => setOpenIndex(isOpen ? -1 : i)}
                aria-expanded={isOpen}
              >
                <span>{copy.q}</span>
                {/* +/− icon */}
                <span className="relative w-[18px] h-[18px] shrink-0" aria-hidden="true">
                  <span className="absolute top-[8px] left-0 w-[18px] h-[2.5px] bg-green rounded-sm" />
                  <span
                    className="absolute left-[8px] top-0 w-[2.5px] h-[18px] bg-green rounded-sm transition-transform duration-250"
                    style={{ transform: isOpen ? 'scaleY(0)' : 'scaleY(1)' }}
                  />
                </span>
              </button>
              <div className={`faq-answer ${isOpen ? 'is-open' : ''}`}>
                <p className="px-[22px] pb-[22px] text-muted text-base m-0">{copy.a}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function FinalCTASection({ lang }: { lang: string }) {
  return (
    <section className="relative bg-green text-paper overflow-hidden text-center px-6 py-[100px]">
      {/* Starbursts */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        <Starburst size={140} color="#F4C24B" spikes={20} depth={0.6} style={{ position: 'absolute', top: '8%', left: '6%' }} />
        <Starburst size={96}  color="#F0609E" spikes={16} depth={0.55} style={{ position: 'absolute', bottom: '10%', right: '8%' }} />
      </div>

      <div className="relative z-[2] max-w-[760px] mx-auto">
        <h2
          className="font-display text-paper leading-[1.02] tracking-[-0.01em] m-0"
          style={{ fontSize: 'clamp(2.4rem,6vw,4.4rem)' }}
        >
          {t('Ready to turn waste into rewards?', 'Sedia tukar sampah jadi hadiah?', lang)}
        </h2>
        <p className="text-[#cfe6cf] text-[1.18rem] mt-5 mb-[34px] max-w-[46ch] mx-auto m-0">
          {t(
            'Scan your card at any drop-off point. No app, no sign-up.',
            'Imbas kad anda di mana-mana pusat. Tiada aplikasi, tiada pendaftaran.',
            lang
          )}
        </p>
        <a
          href="#top"
          className="inline-flex items-center gap-[9px] bg-paper text-green font-bold text-[1.1rem] px-[34px] py-[18px] rounded-[12px] shadow-[4px_4px_0_#1B2E1C] hover:bg-white hover:text-green-deep hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[6px_6px_0_#1B2E1C] transition-all duration-150 no-underline"
        >
          {t('Scan your card', 'Imbas kad anda', lang)}
          <Icon name="arrow" size={20} />
        </a>
      </div>
    </section>
  )
}

function FooterSection({ lang }: { lang: string }) {
  return (
    <footer className="bg-green-deep text-paper px-6 py-14 text-center">
      <div className="max-w-[1160px] mx-auto">
        <a href="#top" className="inline-flex items-center justify-center gap-[10px] text-paper no-underline mb-[14px]">
          <span className="w-[30px] h-[30px] rounded-[9px] bg-paper text-green grid place-items-center shrink-0">
            <Icon name="recycle" size={18} />
          </span>
          <span className="font-display text-[1.32rem] tracking-[.01em]">
            Waste<span className="text-sun">2</span>Points
          </span>
        </a>
        <p className="font-display text-[1.3rem] m-0">
          {t('A community recycling rewards programme.', 'Program ganjaran kitar semula komuniti.', lang)}
        </p>
        <p className="text-[#9ec79e] text-[.9rem] mt-2 m-0">
          {t('Run with your block leaders.', 'Dikendalikan bersama ketua blok.', lang)}
        </p>
      </div>
    </footer>
  )
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */

export default function HomePage() {
  const { lang } = useLang()

  return (
    <main>
      <HeroSection lang={lang} />
      <HowItWorksSection lang={lang} />
      <RewardsSection lang={lang} />
      <ImpactSection lang={lang} />
      <LocationsSection lang={lang} />
      <TestimonialsSection lang={lang} />
      <FAQSection lang={lang} />
      <FinalCTASection lang={lang} />
      <FooterSection lang={lang} />
    </main>
  )
}
