import { createClient } from '@libsql/client'

const TURSO_URL = process.env.TURSO_URL!
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN!

if (!TURSO_URL || !TURSO_AUTH_TOKEN) {
  console.error('Missing TURSO_URL or TURSO_AUTH_TOKEN')
  process.exit(1)
}

const client = createClient({ url: TURSO_URL, authToken: TURSO_AUTH_TOKEN })

async function main() {
  console.log('Creating tables...')

  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "Household" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "qrCode"    TEXT NOT NULL UNIQUE,
      "unit"      TEXT NOT NULL,
      "phone"     TEXT UNIQUE,
      "points"    INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS "Scan" (
      "id"           TEXT NOT NULL PRIMARY KEY,
      "householdId"  TEXT NOT NULL,
      "category"     TEXT NOT NULL,
      "weightKg"     REAL NOT NULL,
      "pointsEarned" INTEGER NOT NULL,
      "photoUrl"     TEXT NOT NULL,
      "photoHash"    TEXT,
      "status"       TEXT NOT NULL DEFAULT 'pending',
      "rejectedAt"   DATETIME,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("householdId") REFERENCES "Household"("id")
    );

    CREATE TABLE IF NOT EXISTS "Redemption" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "householdId" TEXT NOT NULL,
      "rewardKey"   TEXT NOT NULL,
      "pointsCost"  INTEGER NOT NULL,
      "redeemedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("householdId") REFERENCES "Household"("id")
    );

    CREATE TABLE IF NOT EXISTS "Voucher" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "code"        TEXT NOT NULL UNIQUE,
      "householdId" TEXT NOT NULL,
      "rewardKey"   TEXT NOT NULL,
      "rewardLabel" TEXT NOT NULL,
      "pointsCost"  INTEGER NOT NULL,
      "status"      TEXT NOT NULL DEFAULT 'active',
      "redeemedAt"  DATETIME,
      "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY ("householdId") REFERENCES "Household"("id")
    );

    CREATE TABLE IF NOT EXISTS "ApprovalBatch" (
      "id"              TEXT NOT NULL PRIMARY KEY,
      "weekLabel"       TEXT NOT NULL,
      "truckWeightKg"   REAL NOT NULL,
      "digitalWeightKg" REAL NOT NULL,
      "scanCount"       INTEGER NOT NULL,
      "approvedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `)

  console.log('Tables created.')
  console.log('Seeding households...')

  const households = [
    { id: 'seed-hh-001', qrCode: 'DM-8-001', unit: '8-1-1', points: 0 },
    { id: 'seed-hh-002', qrCode: 'DM-8-002', unit: '8-1-2', points: 120 },
    { id: 'seed-hh-003', qrCode: 'DM-8-003', unit: '8-2-1', points: 45 },
    { id: 'seed-hh-004', qrCode: 'DM-8-004', unit: '8-2-2', points: 0 },
    { id: 'seed-hh-005', qrCode: 'DM-8-005', unit: '8-3-1', points: 200 },
  ]

  for (const h of households) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO "Household" ("id","qrCode","unit","points","createdAt") VALUES (?,?,?,?,datetime('now'))`,
      args: [h.id, h.qrCode, h.unit, h.points],
    })
    console.log(`  ✓ ${h.qrCode} — Unit ${h.unit} — ${h.points} pts`)
  }

  console.log('\nDone! Turso database is ready.')
  console.log('Test QR codes: DM-8-001 to DM-8-005')
}

main().catch(e => { console.error(e); process.exit(1) })
