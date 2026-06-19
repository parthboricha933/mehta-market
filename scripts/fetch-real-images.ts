// Search for real product images for all 337 products using the z-ai image-search CLI.
// Updates the database with the OSS-hosted image URLs.
//
// Runs in batches with delays to avoid overwhelming the search service.
// Skips products that already have a non-SVG image URL.

import { db } from '../src/lib/db'
import { execSync } from 'child_process'

async function main() {
  const products = await db.product.findMany({ include: { category: true } })
  console.log(`Found ${products.length} products\n`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]

    // Skip if already has a real image (not our SVG placeholder)
    let currentImages: string[] = []
    try { currentImages = JSON.parse(p.images) } catch {}
    const currentUrl = currentImages[0] || ''
    if (currentUrl.includes('sfile.chatglm.cn') || currentUrl.includes('images.unsplash.com')) {
      skipped++
      continue
    }

    // Build search query — use product name + brand for best results
    const query = `${p.brand ? p.brand + ' ' : ''}${p.name} product image india`

    try {
      // Call z-ai image-search CLI
      const result = execSync(
        `z-ai image-search -q "${query.replace(/"/g, '\\"')}" --count 1 --no-rank --gl us`,
        { encoding: 'utf-8', timeout: 120000 }
      )

      // Parse the JSON from stdout (skip the emoji log lines)
      const jsonStart = result.indexOf('{')
      if (jsonStart === -1) {
        console.log(`  [${i + 1}/${products.length}] ❌ No JSON in response for: ${p.name}`)
        failed++
        continue
      }
      const jsonStr = result.substring(jsonStart)
      const data = JSON.parse(jsonStr)

      if (data.success && data.results && data.results.length > 0) {
        const imageUrl = data.results[0].original_url
        await db.product.update({
          where: { id: p.id },
          data: { images: JSON.stringify([imageUrl]) },
        })
        updated++
        console.log(`  [${i + 1}/${products.length}] ✅ ${p.name} → ${imageUrl.substring(0, 60)}...`)

        // Small delay between searches to be respectful
        await new Promise((r) => setTimeout(r, 8000))
      } else {
        console.log(`  [${i + 1}/${products.length}] ❌ No results for: ${p.name}`)
        failed++
      }
    } catch (e: any) {
      console.log(`  [${i + 1}/${products.length}] ❌ Error for ${p.name}: ${e.message?.slice(0, 100)}`)
      failed++
      // Longer delay on error
      await new Promise((r) => setTimeout(r, 15000))
    }
  }

  console.log(`\n═══════════════════════════════════════════════════════════════`)
  console.log(`  RESULT: ${updated} updated, ${skipped} skipped, ${failed} failed`)
  console.log(`═══════════════════════════════════════════════════════════════`)

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
