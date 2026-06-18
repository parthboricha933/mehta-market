// Auto-seed helper for serverless deployments (Vercel).
// On Vercel, the SQLite database file is ephemeral — it gets recreated on each
// cold start. This helper:
// 1. Pushes the Prisma schema to the (empty) database file
// 2. Seeds it with default admin + categories + settings + sample products
//
// In production you should switch to a persistent database (Turso, PlanetScale,
// Neon, etc.) — but this helper keeps the demo functional on Vercel's free tier.

import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

const SEED_CATEGORIES = [
  { name: 'Grocery', slug: 'grocery', icon: 'ShoppingBasket' },
  { name: 'Fruits', slug: 'fruits', icon: 'Apple' },
  { name: 'Vegetables', slug: 'vegetables', icon: 'Carrot' },
  { name: 'Dairy', slug: 'dairy', icon: 'Milk' },
  { name: 'Snacks', slug: 'snacks', icon: 'Cookie' },
  { name: 'Beverages', slug: 'beverages', icon: 'CupSoda' },
  { name: 'Household Items', slug: 'household', icon: 'Home' },
]

const SAMPLE_PRODUCTS = [
  { name: 'Aashirvaad Atta - Whole Wheat', description: 'Premium quality whole wheat flour, 5kg pack', price: 245, mrp: 280, unit: '5 kg', cat: 'grocery', img: 'photo-1574323347407-f5e1ad6d020b' },
  { name: 'Tata Salt - Iodized', description: 'Refined iodized salt, 1kg pack', price: 28, mrp: 32, unit: '1 kg', cat: 'grocery', img: 'photo-1518110925495-b37653f4f4f0' },
  { name: 'Fortune Sunflower Oil', description: 'Refined sunflower oil, 1L pouch', price: 145, mrp: 165, unit: '1 L', cat: 'grocery', img: 'photo-1474979266404-7eaacbcd87c5' },
  { name: 'Basmati Rice - Premium', description: 'Aged premium basmati rice, 5kg pack', price: 425, mrp: 480, unit: '5 kg', cat: 'grocery', img: 'photo-1586201375761-83865001e31c' },
  { name: 'Toor Dal', description: 'Premium quality toor dal, 1kg', price: 135, mrp: 155, unit: '1 kg', cat: 'grocery', img: 'photo-1599909533730-f9ba0f3c7b39' },
  { name: 'Tata Sugar', description: 'Refined white sugar, 1kg pack', price: 45, mrp: 52, unit: '1 kg', cat: 'grocery', img: 'photo-1610725664285-7c57e6eeac4f' },
  { name: 'Fresh Bananas', description: 'Sweet ripe bananas, sourced fresh daily', price: 49, mrp: 60, unit: '1 dozen', cat: 'fruits', img: 'photo-1571771894821-ce9b6c11b08e' },
  { name: 'Red Apples - Shimla', description: 'Crispy and sweet Shimla apples', price: 180, mrp: 220, unit: '1 kg', cat: 'fruits', img: 'photo-1560806887-1e4cd0b6cbd6' },
  { name: 'Sweet Oranges', description: 'Juicy oranges', price: 90, mrp: 110, unit: '1 kg', cat: 'fruits', img: 'photo-1611080626919-7cf5a9dbab5b' },
  { name: 'Fresh Tomatoes', description: 'Farm fresh ripe tomatoes', price: 35, mrp: 45, unit: '1 kg', cat: 'vegetables', img: 'photo-1546470427-e26264be0b0d' },
  { name: 'Onions - Fresh', description: 'Quality onions, sourced from local farms', price: 38, mrp: 50, unit: '1 kg', cat: 'vegetables', img: 'photo-1620574387735-3624d75b2db9' },
  { name: 'Potatoes - Fresh', description: 'Fresh potatoes, perfect for everyday cooking', price: 32, mrp: 40, unit: '1 kg', cat: 'vegetables', img: 'photo-1518977676601-b53f82aba655' },
  { name: 'Green Capsicum', description: 'Fresh crunchy green capsicum', price: 60, mrp: 75, unit: '500 g', cat: 'vegetables', img: 'photo-1563565375-f3fdfdbefa83' },
  { name: 'Amul Taaza Milk', description: 'Toned milk, 500ml pouch', price: 28, mrp: 30, unit: '500 ml', cat: 'dairy', img: 'photo-1563636619-e9143da7973b' },
  { name: 'Amul Butter', description: 'Pasteurised salted butter, 100g', price: 56, mrp: 60, unit: '100 g', cat: 'dairy', img: 'photo-1589985270826-4b7bb135bc9d' },
  { name: "Lay's Classic Salted Chips", description: 'Crispy salted potato chips, 52g pack', price: 20, mrp: 25, unit: '52 g', cat: 'snacks', img: 'photo-1613919113640-25732ec5e0f6' },
  { name: 'Coca-Cola - 750ml', description: 'Refreshing cola, 750ml bottle', price: 38, mrp: 42, unit: '750 ml', cat: 'beverages', img: 'photo-1622483767028-3f66f3825dbd' },
  { name: 'Bisleri Mineral Water', description: 'Packaged drinking water, 1L bottle', price: 20, mrp: 22, unit: '1 L', cat: 'beverages', img: 'photo-1560847468-5eef0e58881c' },
  { name: 'Surf Excel Detergent Powder', description: 'Powerful detergent, 1kg pack', price: 145, mrp: 175, unit: '1 kg', cat: 'household', img: 'photo-1610557892470-55d9e80c0bce' },
  { name: 'Lifebuoy Soap - Total', description: 'Germ protection soap, 125g (pack of 4)', price: 130, mrp: 160, unit: '500 g', cat: 'household', img: 'photo-1607006344380-b6775a0824a9' },
]

const img = (q: string, w = 600) => `https://images.unsplash.com/${q}?auto=format&fit=crop&w=${w}&q=70`

let seedPromise: Promise<void> | null = null

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise
  seedPromise = doSeed()
  return seedPromise
}

async function doSeed(): Promise<void> {
  try {
    // Try a simple query first to see if the schema exists.
    // If it fails with "table does not exist", we need to push the schema.
    let needsSchema = false
    try {
      await db.category.count()
    } catch (e: any) {
      // P1014 = "Unknown PRisma query engine" / P2021 = "table does not exist"
      // P1003 = "Table does not exist"
      needsSchema = true
    }

    if (needsSchema) {
      // Push the schema by executing raw SQL. This is the equivalent of `prisma db push`.
      // Use multi-statements to create all tables in one call.
      const schemaSql = `
        CREATE TABLE IF NOT EXISTS "Admin" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL,
          "passwordHash" TEXT NOT NULL,
          "name" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Admin_username_key" UNIQUE ("username")
        );
        CREATE TABLE IF NOT EXISTS "Category" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "icon" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Category_name_key" UNIQUE ("name"),
          CONSTRAINT "Category_slug_key" UNIQUE ("slug")
        );
        CREATE TABLE IF NOT EXISTS "Product" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT,
          "price" REAL NOT NULL,
          "mrp" REAL,
          "unit" TEXT,
          "images" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL,
          "stock" INTEGER NOT NULL DEFAULT 0,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "soldCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderNumber" TEXT NOT NULL,
          "customerName" TEXT NOT NULL,
          "mobile" TEXT NOT NULL,
          "address" TEXT NOT NULL,
          "landmark" TEXT,
          "notes" TEXT,
          "subtotal" REAL NOT NULL,
          "deliveryCharge" REAL NOT NULL,
          "total" REAL NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Order_orderNumber_key" UNIQUE ("orderNumber")
        );
        CREATE TABLE IF NOT EXISTS "OrderItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "productId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "price" REAL NOT NULL,
          "quantity" INTEGER NOT NULL,
          "image" TEXT,
          CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "Setting" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "key" TEXT NOT NULL,
          "value" TEXT NOT NULL,
          "updatedAt" DATETIME NOT NULL,
          CONSTRAINT "Setting_key_key" UNIQUE ("key")
        );
        CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");
        CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
        CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");
      `
      // Execute each statement separately (SQLite doesn't support multi-statement
      // in a single $executeRawUnsafe call reliably)
      for (const stmt of schemaSql.split(';').map(s => s.trim()).filter(Boolean)) {
        try {
          await db.$executeRawUnsafe(stmt + ';')
        } catch (e: any) {
          // Ignore "table/index already exists" errors
          if (!String(e?.message || '').includes('already exists')) {
            console.error('[seed] schema stmt failed:', e?.message?.slice(0, 200))
          }
        }
      }
      console.log('[seed] Schema pushed to database')
    }

    // Now check if data needs seeding
    const catCount = await db.category.count()
    if (catCount > 0) return // already seeded

    // Create admin (with hashed password)
    const existingAdmin = await db.admin.findFirst({ where: { username: 'admin' } })
    if (!existingAdmin) {
      const hashed = await hashPassword('mehta123')
      await db.admin.create({
        data: { username: 'admin', passwordHash: hashed, name: 'Mehta Admin' },
      })
    }

    // Create categories
    for (const c of SEED_CATEGORIES) {
      await db.category.create({ data: { name: c.name, slug: c.slug, icon: c.icon } })
    }

    // Create sample products
    for (const p of SAMPLE_PRODUCTS) {
      const category = await db.category.findFirst({ where: { slug: p.cat } })
      if (!category) continue
      await db.product.create({
        data: {
          name: p.name,
          description: p.description,
          price: p.price,
          mrp: p.mrp,
          unit: p.unit,
          images: JSON.stringify([img(p.img, 600)]),
          categoryId: category.id,
          stock: 100,
          isActive: true,
        },
      })
    }

    // Default settings
    await db.setting.upsert({
      where: { key: 'offer_popup' },
      update: {},
      create: {
        key: 'offer_popup',
        value: JSON.stringify({
          enabled: true,
          title: 'Mega Sale - Up to 40% OFF!',
          description: 'Shop fresh groceries, fruits, vegetables and more. Get exclusive discounts on your first order. Free home delivery on orders above ₹500 in Rajula city.',
          image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=70',
          ctaText: 'Shop Now',
        }),
      },
    })

    await db.setting.upsert({
      where: { key: 'announcements' },
      update: {},
      create: {
        key: 'announcements',
        value: JSON.stringify([
          '🚚 Free Home Delivery on Orders Above ₹500 in Rajula',
          '🎉 Special Discounts Available - Save Big on Groceries',
          '🥬 Fresh Fruits & Vegetables Daily',
          '📞 Order on WhatsApp: +91 98765 43210',
          '⏰ Open Daily 7:00 AM to 10:00 PM',
        ]),
      },
    })

    await db.setting.upsert({
      where: { key: 'shop_info' },
      update: {},
      create: {
        key: 'shop_info',
        value: JSON.stringify({
          name: 'Mehta Super Market',
          city: 'Rajula',
          phone: '+919876543210',
          whatsapp: '+919876543210',
          address: 'Main Bazar, Rajula, Amreli, Gujarat 365560',
          hours: '7:00 AM - 10:00 PM',
          minOrderForFreeDelivery: 500,
          deliveryCharge: 30,
          deliveryArea: 'Rajula city only',
        }),
      },
    })

    console.log('[seed] Database auto-seeded with default data')
  } catch (e: any) {
    console.error('[seed] Auto-seed failed:', e?.message?.slice(0, 300))
  }
}
