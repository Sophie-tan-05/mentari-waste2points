import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../app/generated/prisma/client'
import * as path from 'path'

const dbPath = path.resolve(process.cwd(), (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, ''))
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.approvalBatch.deleteMany()
  await prisma.voucher.deleteMany()
  await prisma.redemption.deleteMany()
  await prisma.scan.deleteMany()
  await prisma.household.updateMany({ data: { points: 0 } })
  console.log('✅ All records cleared, points reset to 0.')
}

main().finally(() => prisma.$disconnect())
