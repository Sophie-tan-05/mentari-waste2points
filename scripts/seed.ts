import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client'
import * as path from 'path'

const dbUrl = process.env.DATABASE_URL ?? 'file:./dev.db'

function makeClient() {
  if (dbUrl.startsWith('libsql://')) {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    return new PrismaClient({
      adapter: new PrismaLibSql({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN }),
    })
  }
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
  const dbPath = path.resolve(process.cwd(), dbUrl.replace(/^file:/, ''))
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) })
}

const prisma = makeClient()

const households = [
  { qrCode: 'DM-8-001', unit: '8-1-1', points: 0   },
  { qrCode: 'DM-8-002', unit: '8-1-2', points: 120 },
  { qrCode: 'DM-8-003', unit: '8-2-1', points: 45  },
  { qrCode: 'DM-8-004', unit: '8-2-2', points: 0   },
  { qrCode: 'DM-8-005', unit: '8-3-1', points: 200 },
]

async function main() {
  console.log('Seeding households...\n')

  for (const h of households) {
    const record = await prisma.household.upsert({
      where:  { qrCode: h.qrCode },
      update: { unit: h.unit, points: h.points },
      create: h,
    })
    console.log(`✓ ${record.qrCode}  Unit ${record.unit}  ${record.points} pts`)
  }

  console.log('\nDone — 5 households seeded.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
