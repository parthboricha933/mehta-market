import { db } from '../src/lib/db'
import { execSync } from 'child_process'

async function main() {
  const products = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    include: { category: true },
    take: 250,
  })

  console.log(`Processing ${products.length} products with 30s delay`)

  let updated = 0
  let failed = 0
  let consecutive429 = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const query = p.brand && !p.name.startsWith(p.brand) 
      ? `${p.brand} ${p.name} product` 
      : `${p.name} product`

    try {
      const result = execSync(
        `z-ai image-search -q "${query.replace(/"/g, '\\"')}" --count 1 --no-rank --gl us`,
        { encoding: 'utf-8', timeout: 120000 }
      )

      const jsonStart = result.indexOf('{')
      if (jsonStart === -1) { failed++; continue }
      const data = JSON.parse(result.substring(jsonStart))

      if (data.success && data.results?.length > 0) {
        const imageUrl = data.results[0].original_url
        await db.product.update({
          where: { id: p.id },
          data: { images: JSON.stringify([imageUrl]) },
        })
        updated++
        consecutive429 = 0
        console.log(`[${updated + failed}/${products.length}] ✅ ${p.name}`)
        await new Promise((r) => setTimeout(r, 30000)) // 30s delay
      } else {
        failed++
        console.log(`[${updated + failed}/${products.length}] ❌ No results: ${p.name}`)
        await new Promise((r) => setTimeout(r, 10000))
      }
    } catch (e: any) {
      failed++
      const msg = e.message?.slice(0, 80) || 'unknown'
      console.log(`[${updated + failed}/${products.length}] ❌ ${p.name}: ${msg}`)
      
      if (msg.includes('429')) {
        consecutive429++
        if (consecutive429 >= 5) {
          console.log('  5 consecutive 429s — stopping to avoid ban')
          break
        }
        console.log('  Rate limited, waiting 120s...')
        await new Promise((r) => setTimeout(r, 120000))
      } else {
        consecutive429 = 0
        await new Promise((r) => setTimeout(r, 15000))
      }
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`)
  await db.$disconnect()
}

main().catch(console.error)
