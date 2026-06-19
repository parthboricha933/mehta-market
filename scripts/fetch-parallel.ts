import { db } from '../src/lib/db'
import { execSync } from 'child_process'

const WORKER_ID = process.argv[2] || '0'
const TOTAL_WORKERS = 3

async function main() {
  const allProducts = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    include: { category: true },
  })
  // Split products across workers
  const myProducts = allProducts.filter((_, i) => i % TOTAL_WORKERS === parseInt(WORKER_ID))
  console.log(`Worker ${WORKER_ID}: processing ${myProducts.length} products`)
  
  let updated = 0, failed = 0
  for (let i = 0; i < myProducts.length; i++) {
    const p = myProducts[i]
    const query = p.brand && !p.name.startsWith(p.brand) ? `${p.brand} ${p.name} product` : `${p.name} product`
    try {
      const result = execSync(`z-ai image-search -q "${query.replace(/"/g, '\\"')}" --count 1 --no-rank --gl us`, { encoding: 'utf-8', timeout: 90000 })
      const jsonStart = result.indexOf('{')
      if (jsonStart === -1) { failed++; continue }
      const data = JSON.parse(result.substring(jsonStart))
      if (data.success && data.results?.length > 0) {
        await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify([data.results[0].original_url]) } })
        updated++
        console.log(`W${WORKER_ID} [${updated + failed}/${myProducts.length}] ✅ ${p.name}`)
        await new Promise(r => setTimeout(r, 3000))
      } else { failed++; await new Promise(r => setTimeout(r, 2000)) }
    } catch (e: any) {
      failed++
      const msg = e.message?.slice(0, 60) || 'unknown'
      console.log(`W${WORKER_ID} [${updated + failed}/${myProducts.length}] ❌ ${p.name}: ${msg}`)
      if (msg.includes('429')) {
        console.log(`W${WORKER_ID} 429 — waiting 90s`)
        await new Promise(r => setTimeout(r, 90000))
      } else { await new Promise(r => setTimeout(r, 5000)) }
    }
  }
  console.log(`W${WORKER_ID} Done: ${updated} updated, ${failed} failed`)
  await db.$disconnect()
}
main().catch(console.error)
