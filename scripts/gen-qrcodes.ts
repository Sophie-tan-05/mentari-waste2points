import 'dotenv/config'
import QRCode from 'qrcode'
import { writeFileSync } from 'fs'
import * as path from 'path'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../app/generated/prisma/client'

const dbPath = path.resolve(
  process.cwd(),
  (process.env.DATABASE_URL ?? 'file:./dev.db').replace(/^file:/, '')
)
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: dbPath }) })

async function main() {
  const households = await prisma.household.findMany({ orderBy: { unit: 'asc' } })

  if (households.length === 0) {
    console.error('No households found. Run: npm run seed')
    process.exit(1)
  }

  // Generate QR data URLs for each household
  const cards = await Promise.all(
    households.map(async h => {
      const dataUrl = await QRCode.toDataURL(h.qrCode, {
        width: 200,
        margin: 2,
        color: { dark: '#1B2E1C', light: '#FFFFFF' },
      })
      return { ...h, dataUrl }
    })
  )

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Waste2Points — QR Cards</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f5f5f5;
      padding: 24px;
    }
    h1 {
      text-align: center;
      color: #2E7D32;
      margin-bottom: 8px;
      font-size: 20px;
    }
    .subtitle {
      text-align: center;
      color: #5A7A5C;
      font-size: 13px;
      margin-bottom: 24px;
    }
    .grid {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
    }
    .card {
      background: white;
      border: 2px solid #C8E6C9;
      border-radius: 16px;
      padding: 20px 16px 16px;
      width: 180px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      break-inside: avoid;
    }
    .card-header {
      background: #2E7D32;
      color: white;
      border-radius: 8px;
      padding: 6px 10px;
      font-weight: bold;
      font-size: 13px;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    .card img {
      width: 140px;
      height: 140px;
      border-radius: 4px;
    }
    .unit {
      margin-top: 10px;
      font-size: 15px;
      font-weight: bold;
      color: #1B2E1C;
    }
    .qr-code-text {
      font-size: 11px;
      color: #5A7A5C;
      margin-top: 4px;
      font-family: monospace;
    }
    .instructions {
      margin-top: 8px;
      font-size: 10px;
      color: #888;
      line-height: 1.4;
    }
    .divider {
      border-top: 1px dashed #C8E6C9;
      margin-top: 10px;
      padding-top: 8px;
    }
    .app-url {
      font-size: 10px;
      color: #2E7D32;
      font-weight: bold;
    }
    @media print {
      body { background: white; padding: 10px; }
      h1, .subtitle { display: none; }
      .grid { gap: 12px; }
      .card { box-shadow: none; border-color: #aaa; }
    }
  </style>
</head>
<body>
  <h1>♻️ Waste2Points — QR Cards</h1>
  <p class="subtitle">Print and cut. Give one card per household. / Cetak dan gunting. Satu kad untuk setiap isi rumah.</p>

  <div class="grid">
    ${cards.map(h => `
    <div class="card">
      <div class="card-header">♻️ Waste2Points</div>
      <img src="${h.dataUrl}" alt="QR code for ${h.qrCode}" />
      <div class="unit">Unit ${h.unit}</div>
      <div class="qr-code-text">${h.qrCode}</div>
      <div class="divider">
        <div class="instructions">
          Imbas kod ini untuk hantar kitar semula<br>
          Scan to submit recycling
        </div>
        <div class="app-url">localhost:3000</div>
      </div>
    </div>`).join('')}
  </div>
</body>
</html>`

  const outPath = path.join(process.cwd(), 'public', 'qr-cards.html')
  writeFileSync(outPath, html, 'utf8')

  console.log(`\n✓ Generated ${cards.length} QR cards`)
  console.log(`  Open in browser: http://localhost:3000/qr-cards.html`)
  console.log(`  Then: File → Print (or Cmd+P) → Save as PDF\n`)

  for (const h of cards) {
    console.log(`  ${h.qrCode}  →  Unit ${h.unit}`)
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
