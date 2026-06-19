import { db } from '../src/lib/db'
import { execSync } from 'child_process'

async function main() {
  const products = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    include: { category: true },
  })
  console.log(`Processing ${products.length} products with 5s delay`)
  let updated = 0, failed = 0
  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    const query = p.brand && !p.name.startsWith(p.brand) ? `${p.brand} ${p.name} product` : `${p.name} product`
    try {
      const result = execSync(`z-ai image-search -q "${query.replace(/"/g, '\\"')}" --count 1 --no-rank --gl us`, { encoding: 'utf-8', timeout: 90000 })
      const jsonStart = result.indexOf('{')
      if (jsonStart === -1) { failed++; continue }
      const data = JSON.parse(result.substring(jsonStart))
      if (data.success && data.results?.length > 0) {
        await db.product.update({ where: { id: p.id }, data: { images: JSON.stringify([data.results[0].original_url]) } })
        updated++
        console.log(`[${updated + failed}/${products.length}] ✅ ${p.name}`)
        await new Promise(r => setTimeout(r, 5000))
      } else { failed++; await new Promise(r => setTimeout(r, 3000)) }
    } catch (e: any) {
      failed++
      const msg = e.message?.slice(0, 80) || 'unknown'
      console.log(`[${updated + failed}/${products.length}] ❌ ${p.name}: ${msg}`)
      if (msg.includes('429')) {
        console.log('  429 rate limit — waiting 60s')
        await new Promise(r => setTimeout(r, 60000))
      } else {
        await new Promise(r => setTimeout(r, 8000))
      }
    }
  }
  console.log(`Done: ${updated} updated, ${failed} failed`)
  await db.$disconnect()
}
main().catch(console.error)
