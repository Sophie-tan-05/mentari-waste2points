import 'dotenv/config'
import { PrismaClient } from '@/app/generated/prisma/client'
import * as path from 'path'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

function makePrisma(): PrismaClient {
  // TURSO_URL is a fallback for deployments where DATABASE_URL isn't the libsql URL
  const dbUrl = process.env.DATABASE_URL ?? process.env.TURSO_URL ?? 'file:./dev.db'

  // Turso / libSQL (cloud) — URL starts with libsql://
  // PrismaLibSql takes a config object (url, authToken), NOT a pre-created client
  if (dbUrl.startsWith('libsql://')) {
    const { PrismaLibSql } = require('@prisma/adapter-libsql')
    return new PrismaClient({
      adapter: new PrismaLibSql({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN }),
    })
  }

  // Local SQLite file
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3')
  const dbPath = path.resolve(process.cwd(), dbUrl.replace(/^file:/, ''))
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) })
}

export const prisma = globalForPrisma.prisma ?? makePrisma()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
