import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import PointsBadge from '@/components/PointsBadge'
import ScanForm from '@/components/ScanForm'
import PhoneRegister from '@/components/PhoneRegister'

export default async function ScanPage({
  params,
}: {
  params: Promise<{ qrCode: string }>
}) {
  const { qrCode } = await params

  const household = await prisma.household.findUnique({ where: { qrCode } })
  if (!household) notFound()

  return (
    <main className="max-w-md mx-auto px-4 py-6 space-y-5">
      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link href="/" className="text-brand-muted text-sm flex items-center gap-1 hover:text-brand-green transition-colors">
          ← Laman Utama / Home
        </Link>
        <Link
          href={`/points/${qrCode}?tab=vouchers`}
          className="text-brand-green text-sm font-semibold flex items-center gap-1 hover:text-brand-green-mid transition-colors"
        >
          🎫 Baucar Saya / My Vouchers
        </Link>
      </div>

      <PointsBadge unit={household.unit} points={household.points} />

      {/* Phone registration prompt — shown only if no phone saved yet */}
      {!household.phone && (
        <PhoneRegister qrCode={qrCode} lang="en" />
      )}

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-brand-border p-5 shadow-sm">
        <h2 className="text-brand-charcoal text-base font-semibold mb-4">
          Hantar Kitar Semula / Submit Recycling
        </h2>
        <ScanForm qrCode={qrCode} />
      </div>
    </main>
  )
}
