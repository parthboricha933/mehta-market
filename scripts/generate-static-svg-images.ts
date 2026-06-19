// Generate static SVG product images and save them to /public/uploads/products/.
// SVG is a text file — Vercel serves it as a STATIC ASSET (no serverless function
// needed, no concurrency limits, no cold starts, cached at CDN edge).
//
// This replaces the dynamic /api/product-image/[slug] endpoint which was failing
// under load (browser couldn't decode 337 simultaneous serverless responses).
//
// After running this, commit the SVG files to git so they deploy with the app.

import { db } from '../src/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const CATEGORY_COLORS: Record<string, { from: string; to: string; emoji: string }> = {
  'milk-dairy': { from: '#3b82f6', to: '#1e40af', emoji: '🥛' },
  'grocery': { from: '#10b981', to: '#047857', emoji: '🛒' },
  'rice-grains': { from: '#f59e0b', to: '#d97706', emoji: '🌾' },
  'atta-flour': { from: '#f59e0b', to: '#b45309', emoji: '🌾' },
  'pulses-dal': { from: '#eab308', to: '#a16207', emoji: '🫘' },
  'oils-ghee': { from: '#fbbf24', to: '#f59e0b', emoji: '🫗' },
  'tea-coffee': { from: '#92400e', to: '#451a03', emoji: '☕' },
  'biscuits': { from: '#d97706', to: '#92400e', emoji: '🍪' },
  'chocolates': { from: '#7c2d12', to: '#431407', emoji: '🍫' },
  'soft-drinks': { from: '#ef4444', to: '#b91c1c', emoji: '🥤' },
  'juices': { from: '#f97316', to: '#ea580c', emoji: '🧃' },
  'snacks': { from: '#f59e0b', to: '#d97706', emoji: '🍿' },
  'namkeen': { from: '#dc2626', to: '#991b1b', emoji: '🥜' },
  'frozen-foods': { from: '#06b6d4', to: '#0e7490', emoji: '🧊' },
  'personal-care': { from: '#ec4899', to: '#be185d', emoji: '🧴' },
  'home-care': { from: '#8b5cf6', to: '#6d28d9', emoji: '🏠' },
  'cleaning-supplies': { from: '#0891b2', to: '#155e75', emoji: '🧽' },
  'baby-care': { from: '#f472b6', to: '#db2777', emoji: '👶' },
  'fruits': { from: '#ef4444', to: '#dc2626', emoji: '🍎' },
  'vegetables': { from: '#22c55e', to: '#15803d', emoji: '🥕' },
  'dairy': { from: '#3b82f6', to: '#1e40af', emoji: '🥛' },
  'beverages': { from: '#ef4444', to: '#b91c1c', emoji: '🥤' },
  'household': { from: '#8b5cf6', to: '#6d28d9', emoji: '🏠' },
}

function escape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function generateSVG(name: string, brand: string, unit: string, cat: string): string {
  const colors = CATEGORY_COLORS[cat] || { from: '#6b7280', to: '#374151', emoji: '📦' }
  const productName = escape(name)
  const brandUpper = escape(brand.toUpperCase())
  const unitEscaped = escape(unit)
  const displayName = productName.length > 30 ? productName.substring(0, 28) + '…' : productName

  return `<svg width="600" height="600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.from}"/>
      <stop offset="100%" stop-color="${colors.to}"/>
    </linearGradient>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.15)"/>
    </linearGradient>
    <filter id="shadow">
      <feGaussianBlur stdDeviation="4"/>
      <feOffset dy="3"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <rect width="600" height="600" fill="url(#bg)"/>
  <rect width="600" height="600" fill="url(#overlay)"/>

  <circle cx="500" cy="100" r="80" fill="rgba(255,255,255,0.08)"/>
  <circle cx="80" cy="520" r="120" fill="rgba(255,255,255,0.06)"/>

  <text x="300" y="280" font-size="180" text-anchor="middle" dominant-baseline="middle" filter="url(#shadow)">${colors.emoji}</text>

  <rect x="40" y="40" width="${brandUpper.length * 12 + 40}" height="44" rx="22" fill="rgba(255,255,255,0.95)"/>
  <text x="${40 + (brandUpper.length * 12 + 40) / 2}" y="68" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${colors.to}" text-anchor="middle">${brandUpper}</text>

  <rect x="0" y="430" width="600" height="170" fill="rgba(0,0,0,0.4)"/>
  <text x="300" y="475" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="white" text-anchor="middle">${displayName}</text>

  <rect x="240" y="510" width="120" height="36" rx="18" fill="rgba(255,255,255,0.25)"/>
  <text x="300" y="534" font-family="Arial, sans-serif" font-size="18" font-weight="600" fill="white" text-anchor="middle">${unitEscaped}</text>

  <text x="300" y="575" font-family="Arial, sans-serif" font-size="13" fill="rgba(255,255,255,0.6)" text-anchor="middle">Mehta Super Market • Rajula</text>
</svg>`
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

async function main() {
  console.log('=== Generating static SVG product images ===\n')

  const imgDir = path.join(process.cwd(), 'public', 'uploads', 'products')
  if (!existsSync(imgDir)) await mkdir(imgDir, { recursive: true })

  const products = await db.product.findMany({ include: { category: true } })
  console.log(`Found ${products.length} products`)

  let generated = 0
  let updated = 0

  for (const p of products) {
    const slug = slugify(p.name)
    const filename = `${slug}.svg`
    const filepath = path.join(imgDir, filename)
    const imageUrl = `/uploads/products/${filename}`

    const svg = generateSVG(p.name, p.brand || 'Brand', p.unit || '', p.category?.slug || '')

    // Write the SVG file
    await writeFile(filepath, svg, 'utf-8')
    generated++

    // Update the product's image URL in the database
    let currentImages: string[] = []
    try { currentImages = JSON.parse(p.images) } catch {}
    if (currentImages[0] !== imageUrl) {
      await db.product.update({
        where: { id: p.id },
        data: { images: JSON.stringify([imageUrl]) },
      })
      updated++
    }

    if (generated % 50 === 0) {
      console.log(`  Generated ${generated}/${products.length} SVG files`)
    }
  }

  console.log(`\n✅ Generated ${generated} SVG files in /public/uploads/products/`)
  console.log(`✅ Updated ${updated} product image URLs in database`)
  console.log(`\nNext: commit /public/uploads/products/*.svg to git and push to Vercel`)

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
