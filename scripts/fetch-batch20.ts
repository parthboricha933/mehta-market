// Fast batch fetcher: processes 20 products, exits, and can be re-run.
// Skips curl verification (trusts Amazon URL format).
// Designed to be run in a loop: `while true; do bun run scripts/fetch-batch20.ts; sleep 5; done`

import { db } from '../src/lib/db'
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'

function extractASIN(url: string): string | null {
  const m = url.match(/\/dp\/([A-Z0-9]{10})/) || url.match(/\/product\/([A-Z0-9]{10})/)
  return m ? m[1] : null
}

async function main() {
  const products = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    take: 20, // Small batch
    orderBy: { name: 'asc' },
  })
  
  if (products.length === 0) {
    console.log('ALL DONE — no more SVG placeholders!')
    process.exit(0)
  }
  
  console.log(`Batch: ${products.length} products`)
  let updated = 0, failed = 0

  for (const p of products) {
    const query = p.brand && !p.name.startsWith(p.brand) 
      ? `${p.brand} ${p.name} site:amazon.in` 
      : `${p.name} site:amazon.in`
    
    try {
      const argsFile = '/tmp/search-args.json'
      writeFileSync(argsFile, JSON.stringify({ query, num: 5 }))
      
      const result = execSync(
        `z-ai function -n web_search -a "$(cat ${argsFile})"`,
        { encoding: 'utf-8', timeout: 60000 }
      )
      
      const jsonStart = result.indexOf('[')
      const jsonEnd = result.lastIndexOf(']')
      if (jsonStart === -1) { failed++; console.log(`❌ ${p.name}`); continue }
      
      const data = JSON.parse(result.substring(jsonStart, jsonEnd + 1))
      let asin: string | null = null
      for (const item of data) {
        if (item.url?.includes('amazon')) {
          asin = extractASIN(item.url)
          if (asin) break
        }
      }
      
      if (asin) {
        const imageUrl = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`
        await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify([imageUrl]) } })
        updated++
        console.log(`✅ ${p.name} → ${asin}`)
      } else {
        failed++
        console.log(`❌ ${p.name} → no ASIN`)
      }
    } catch (e: any) {
      failed++
      console.log(`❌ ${p.name}: ${e.message?.slice(0, 50)}`)
    }
    await new Promise(r => setTimeout(r, 500))
  }
  
  console.log(`\nBatch done: ${updated} updated, ${failed} failed`)
  await db.$disconnect()
}

main().catch(console.error)
