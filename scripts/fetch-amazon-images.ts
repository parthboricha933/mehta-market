// Fetch real product images using web_search to find Amazon ASINs,
// then construct Amazon image URLs directly.

import { db } from '../src/lib/db'
import { execSync } from 'child_process'
import { writeFileSync, readFileSync } from 'fs'

function extractAmazonASIN(url: string): string | null {
  const dpMatch = url.match(/\/dp\/([A-Z0-9]{10})/)
  if (dpMatch) return dpMatch[1]
  const gpMatch = url.match(/\/gp\/product\/([A-Z0-9]{10})/)
  if (gpMatch) return gpMatch[1]
  const productMatch = url.match(/\/product\/([A-Z0-9]{10})/)
  if (productMatch) return productMatch[1]
  return null
}

function searchProductASIN(productName: string, brand?: string): string | null {
  const query = brand && !productName.startsWith(brand) 
    ? `${brand} ${productName} site:amazon.in` 
    : `${productName} site:amazon.in`
  
  // Write args to a temp file to avoid shell quoting issues
  const argsFile = '/tmp/search-args.json'
  writeFileSync(argsFile, JSON.stringify({ query, num: 5 }))
  
  try {
    const result = execSync(
      `z-ai function -n web_search -a "$(cat ${argsFile})"`,
      { encoding: 'utf-8', timeout: 90000 }
    )
    
    // Find the JSON array in the output
    const jsonStart = result.indexOf('[')
    const jsonEnd = result.lastIndexOf(']')
    if (jsonStart === -1 || jsonEnd === -1) return null
    
    const jsonStr = result.substring(jsonStart, jsonEnd + 1)
    let data
    try {
      data = JSON.parse(jsonStr)
    } catch {
      return null
    }
    
    if (!Array.isArray(data)) return null
    
    // Find the first Amazon result and extract ASIN
    for (const item of data) {
      if (item.url && item.url.includes('amazon')) {
        const asin = extractAmazonASIN(item.url)
        if (asin) return asin
      }
    }
    return null
  } catch {
    return null
  }
}

async function main() {
  const products = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    include: { category: true },
  })
  console.log(`Processing ${products.length} products`)

  let updated = 0
  let failed = 0

  for (let i = 0; i < products.length; i++) {
    const p = products[i]
    
    try {
      const asin = searchProductASIN(p.name, p.brand || undefined)
      
      if (asin) {
        const imageUrl = `https://m.media-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_.jpg`
        
        // Verify the image is accessible
        const verifyResult = execSync(
          `curl -sS -o /dev/null -w "%{http_code}" "${imageUrl}"`,
          { encoding: 'utf-8', timeout: 15000 }
        ).trim()
        
        if (verifyResult === '200') {
          await db.product.update({
            where: { id: p.id },
            data: { images: JSON.stringify([imageUrl]) },
          })
          updated++
          console.log(`[${updated + failed}/${products.length}] ✅ ${p.name} → ${asin}`)
          await new Promise(r => setTimeout(r, 1500))
        } else {
          failed++
          console.log(`[${updated + failed}/${products.length}] ⚠️ ${p.name} → ASIN:${asin} but image HTTP ${verifyResult}`)
          await new Promise(r => setTimeout(r, 1000))
        }
      } else {
        failed++
        console.log(`[${updated + failed}/${products.length}] ❌ ${p.name} → no ASIN`)
        await new Promise(r => setTimeout(r, 1000))
      }
    } catch (e: any) {
      failed++
      const msg = e.message?.slice(0, 60) || 'unknown'
      console.log(`[${updated + failed}/${products.length}] ❌ ${p.name}: ${msg}`)
      if (msg.includes('429')) {
        console.log('  429 — waiting 60s')
        await new Promise(r => setTimeout(r, 60000))
      } else {
        await new Promise(r => setTimeout(r, 3000))
      }
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed`)
  await db.$disconnect()
}

main().catch(console.error)
