// Migrate product images to dynamic API endpoint AND populate the brand field.
// This script:
// 1. Extracts brand info from each product name
// 2. Sets the brand field in the database
// 3. Updates image URLs from /uploads/products/X.png to /api/product-image/X?...

import { db } from '../src/lib/db'

// Brand list (longest first so we don't match "Tata" before "Tata Sampann")
const BRANDS = [
  'Haldiram\'s', 'Mother Dairy', 'Tata Sampann', 'Head & Shoulders', 'Organic Tattva',
  'Mountain Dew', 'Johnson\'s', '24 Mantra', 'Brooke Bond', 'Taj Mahal',
  'Wagh Bakri', 'Tata Tea',
  'Coca-Cola', 'Red Bull',
  'Aashirvaad', 'India Gate', 'Pillsbury', 'Patanjali', 'Kohinoor', 'Aeroplane',
  'Britannia', 'Sunfeast', 'Toblerone', 'Bournville',
  'Cadbury', 'Nestle', 'Ferrero', 'Snickers', 'Mars', 'Pampers', 'Huggies',
  'MamyPoko', 'Himalaya', 'Pigeon', 'Mee Mee', 'Saffola', 'Sundrop',
  'Daawat', 'Fortune', 'Rajdhani', 'Bikaji', 'Balaji', 'Lehar',
  'McCain', 'Sumeru', 'Venky\'s', 'Godrej',
  'Colgate', 'Sensodyne', 'Pepsodent', 'Closeup', 'Dove', 'Lux', 'Cinthol',
  'Lifebuoy', 'Dettol', 'Nivea', 'Pond\'s', 'Vaseline', 'Garnier',
  'Surf Excel', 'Ariel', 'Tide', 'Wheel', 'Ghadi', 'Comfort', 'Rin',
  'Clinic Plus',
  'Vim', 'Pril', 'Exo', 'Harpic', 'Domex', 'Lizol', 'Colin', 'Good Home',
  'Odonil', 'Savlon',
  'Pepsi', 'Thums Up', 'Sprite', 'Fanta', 'Limca', 'Sting', 'Bisleri',
  'Real', 'Tropicana', 'Minute Maid', 'B Natural', 'Paper Boat',
  'Lay\'s', 'Kurkure', 'Bingo', 'Uncle Chipps', 'Pringles', 'Too Yumm',
  'Maggi', 'Yippee', 'Top Ramen', 'KitKat', 'Munch',
  '5 Star', 'Perk', 'Oreo', 'Parle', 'Tata', 'Amul', 'MTR', 'Madhur',
  'Society', 'Lipton', 'Tetley', 'Bru', 'Davidoff', 'Continental',
  'Annapurna', 'Dhara', 'ITC', 'Taj',
  'Good Day', 'Hide & Seek', '20-20', 'Milk Bikis', 'NutriChoice', 'Bourbon',
  'Red Label', 'Bisleri',
]

function extractBrand(name: string): string {
  for (const b of BRANDS) {
    if (name.toLowerCase().startsWith(b.toLowerCase())) return b
  }
  return name.split(' ')[0]
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50)
}

async function main() {
  console.log('=== Migrating product images + populating brand field ===\n')

  const products = await db.product.findMany({
    where: { images: { contains: '/uploads/products/' } },
    include: { category: true },
  })

  console.log(`Found ${products.length} products to migrate\n`)

  let updated = 0
  for (const p of products) {
    let images: string[] = []
    try {
      images = JSON.parse(p.images)
    } catch { continue }

    if (images.length === 0) continue
    const oldUrl = images[0]
    if (!oldUrl.includes('/uploads/products/')) continue

    const slug = slugify(p.name)
    const brand = extractBrand(p.name)

    const params = new URLSearchParams({
      name: p.name,
      brand,
      unit: p.unit || '',
      cat: p.category?.slug || '',
    })
    const newUrl = `/api/product-image/${slug}?${params.toString()}`

    await db.product.update({
      where: { id: p.id },
      data: {
        brand,
        images: JSON.stringify([newUrl]),
      },
    })
    updated++

    if (updated % 50 === 0) {
      console.log(`  Migrated ${updated}/${products.length}`)
    }
  }

  console.log(`\n✅ Updated ${updated} products with brand field + dynamic image URLs`)

  // Also update the 38 existing products (which use Unsplash URLs) — give them brand fields too
  const existingProducts = await db.product.findMany({
    where: { brand: null },
    include: { category: true },
  })
  console.log(`\nAlso updating ${existingProducts.length} older products with brand field...`)
  let existingUpdated = 0
  for (const p of existingProducts) {
    const brand = extractBrand(p.name)
    await db.product.update({
      where: { id: p.id },
      data: { brand },
    })
    existingUpdated++
  }
  console.log(`✅ Updated ${existingUpdated} older products with brand field`)

  // Final summary
  const total = await db.product.count()
  const withBrand = await db.product.count({ where: { NOT: { brand: null } } })
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  FINAL STATE')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`  Total products:  ${total}`)
  console.log(`  With brand set:  ${withBrand}`)
  console.log(`  Images:          now served via /api/product-image/[slug] (dynamic)`)
  console.log('═══════════════════════════════════════════════════════════════')

  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
