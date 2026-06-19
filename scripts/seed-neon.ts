// Seed the Neon database with default admin, categories, products, and settings.
// Run with: bun run scripts/seed-neon.ts
import { db } from '../src/lib/db'
import { hashPassword } from '../src/lib/auth'

const CATEGORIES = [
  { name: 'Grocery', slug: 'grocery', icon: 'ShoppingBasket' },
  { name: 'Fruits', slug: 'fruits', icon: 'Apple' },
  { name: 'Vegetables', slug: 'vegetables', icon: 'Carrot' },
  { name: 'Dairy', slug: 'dairy', icon: 'Milk' },
  { name: 'Snacks', slug: 'snacks', icon: 'Cookie' },
  { name: 'Beverages', slug: 'beverages', icon: 'CupSoda' },
  { name: 'Household Items', slug: 'household', icon: 'Home' },
]

const img = (q: string, w = 600) =>
  `https://images.unsplash.com/${q}?auto=format&fit=crop&w=${w}&q=70`

const PRODUCTS = [
  // Grocery
  { name: 'Aashirvaad Atta - Whole Wheat', description: 'Premium quality whole wheat flour, 5kg pack', price: 245, mrp: 280, unit: '5 kg', cat: 'grocery', img: 'photo-1574323347407-f5e1ad6d020b' },
  { name: 'Tata Salt - Iodized', description: 'Refined iodized salt, 1kg pack', price: 28, mrp: 32, unit: '1 kg', cat: 'grocery', img: 'photo-1518110925495-b37653f4f4f0' },
  { name: 'Fortune Sunflower Oil', description: 'Refined sunflower oil, 1L pouch', price: 145, mrp: 165, unit: '1 L', cat: 'grocery', img: 'photo-1474979266404-7eaacbcd87c5' },
  { name: 'Basmati Rice - Premium Long Grain', description: 'Aged premium basmati rice, 5kg pack', price: 425, mrp: 480, unit: '5 kg', cat: 'grocery', img: 'photo-1586201375761-83865001e31c' },
  { name: 'Toor Dal - Yellow Split Pigeon Pea', description: 'Premium quality unpolished toor dal, 1kg', price: 135, mrp: 155, unit: '1 kg', cat: 'grocery', img: 'photo-1599909533730-f9ba0f3c7b39' },
  { name: 'Tata Sugar - Refined', description: 'Refined white sugar, 1kg pack', price: 45, mrp: 52, unit: '1 kg', cat: 'grocery', img: 'photo-1610725664285-7c57e6eeac4f' },

  // Fruits
  { name: 'Fresh Bananas', description: 'Sweet ripe bananas, sourced fresh daily', price: 49, mrp: 60, unit: '1 dozen', cat: 'fruits', img: 'photo-1571771894821-ce9b6c11b08e' },
  { name: 'Red Apples - Shimla', description: 'Crispy and sweet Shimla apples', price: 180, mrp: 220, unit: '1 kg', cat: 'fruits', img: 'photo-1560806887-1e4cd0b6cbd6' },
  { name: 'Sweet Oranges - Nagpur', description: 'Juicy Nagpur oranges', price: 90, mrp: 110, unit: '1 kg', cat: 'fruits', img: 'photo-1611080626919-7cf5a9dbab5b' },
  { name: 'Ripe Mangoes - Alphonso', description: 'Premium Alphonso mangoes', price: 350, mrp: 420, unit: '1 kg', cat: 'fruits', img: 'photo-1553279768-865429fa0078' },
  { name: 'Green Grapes - Seedless', description: 'Fresh seedless green grapes', price: 120, mrp: 150, unit: '500 g', cat: 'fruits', img: 'photo-1599819811279-d5ad9cccf838' },
  { name: 'Fresh Pomegranate', description: 'Juicy and sweet pomegranates', price: 160, mrp: 190, unit: '1 kg', cat: 'fruits', img: 'photo-1635357462784-0e8f8a30c02d' },

  // Vegetables
  { name: 'Fresh Tomatoes', description: 'Farm fresh ripe tomatoes', price: 35, mrp: 45, unit: '1 kg', cat: 'vegetables', img: 'photo-1546470427-e26264be0b0d' },
  { name: 'Onions - Fresh', description: 'Quality onions, sourced from local farms', price: 38, mrp: 50, unit: '1 kg', cat: 'vegetables', img: 'photo-1620574387735-3624d75b2db9' },
  { name: 'Potatoes - Fresh', description: 'Fresh potatoes, perfect for everyday cooking', price: 32, mrp: 40, unit: '1 kg', cat: 'vegetables', img: 'photo-1518977676601-b53f82aba655' },
  { name: 'Green Capsicum', description: 'Fresh crunchy green capsicum', price: 60, mrp: 75, unit: '500 g', cat: 'vegetables', img: 'photo-1563565375-f3fdfdbefa83' },
  { name: 'Fresh Carrots', description: 'Sweet and crunchy carrots', price: 45, mrp: 55, unit: '500 g', cat: 'vegetables', img: 'photo-1598170845058-32b9d6f5d5e3' },
  { name: 'Green Spinach (Palak)', description: 'Fresh leafy spinach', price: 25, mrp: 30, unit: '500 g', cat: 'vegetables', img: 'photo-1576045057995-568f588f82fb' },

  // Dairy
  { name: 'Amul Taaza Milk', description: 'Toned milk, 500ml pouch', price: 28, mrp: 30, unit: '500 ml', cat: 'dairy', img: 'photo-1563636619-e9143da7973b' },
  { name: 'Amul Butter', description: 'Pasteurised salted butter, 100g', price: 56, mrp: 60, unit: '100 g', cat: 'dairy', img: 'photo-1589985270826-4b7bb135bc9d' },
  { name: 'Amul Cheese Slices', description: 'Processed cheese slices, 200g pack', price: 135, mrp: 145, unit: '200 g', cat: 'dairy', img: 'photo-1486297678162-eb2a19b0a32d' },
  { name: 'Mother Dairy Curd', description: 'Fresh thick curd, 400g pack', price: 40, mrp: 45, unit: '400 g', cat: 'dairy', img: 'photo-1571212515416-fef01fc43637' },
  { name: 'Amul Paneer', description: 'Fresh soft paneer, 200g pack', price: 90, mrp: 100, unit: '200 g', cat: 'dairy', img: 'photo-1631452180519-c014fe946bc7' },

  // Snacks
  { name: "Lay's Classic Salted Chips", description: 'Crispy salted potato chips, 52g pack', price: 20, mrp: 25, unit: '52 g', cat: 'snacks', img: 'photo-1613919113640-25732ec5e61f' },
  { name: "Haldiram's Bhujia", description: 'Spicy bhujia namkeen, 200g pack', price: 55, mrp: 65, unit: '200 g', cat: 'snacks', img: 'photo-1599490659213-e2b9527bd087' },
  { name: 'Kurkure Masala Munch', description: 'Crunchy corn puffs, 90g pack', price: 18, mrp: 20, unit: '90 g', cat: 'snacks', img: 'photo-1613919113640-25732ec5e61f' },
  { name: 'Britannia Marie Gold Biscuits', description: 'Light and crispy biscuits, 250g pack', price: 40, mrp: 45, unit: '250 g', cat: 'snacks', img: 'photo-1558961363-fa8fdf82db35' },
  { name: 'Parle-G Glucose Biscuits', description: 'Classic glucose biscuits, 100g pack', price: 10, mrp: 12, unit: '100 g', cat: 'snacks', img: 'photo-1590080875515-8a3a8dc5735e' },

  // Beverages
  { name: 'Coca-Cola - 750ml', description: 'Refreshing cola, 750ml bottle', price: 38, mrp: 42, unit: '750 ml', cat: 'beverages', img: 'photo-1622483767028-3f66f3825dbd' },
  { name: 'Pepsi - 750ml', description: 'Refreshing cola, 750ml bottle', price: 38, mrp: 42, unit: '750 ml', cat: 'beverages', img: 'photo-1629203434119-1f1a3e3c0b1e' },
  { name: 'Real Mixed Fruit Juice', description: '100% fruit juice, 1L pack', price: 110, mrp: 125, unit: '1 L', cat: 'beverages', img: 'photo-1600271886742-f049cd451bba' },
  { name: 'Tata Tea Premium', description: 'Premium tea leaves, 500g pack', price: 270, mrp: 300, unit: '500 g', cat: 'beverages', img: 'photo-1597318181409-cf64d0b5d8a2' },
  { name: 'Nescafe Classic Coffee', description: 'Instant coffee, 100g jar', price: 320, mrp: 360, unit: '100 g', cat: 'beverages', img: 'photo-1559525839-d9acfd8878c5' },
  { name: 'Bisleri Mineral Water', description: 'Packaged drinking water, 1L bottle', price: 20, mrp: 22, unit: '1 L', cat: 'beverages', img: 'photo-1560847468-5eef0e58881c' },

  // Household
  { name: 'Surf Excel Detergent Powder', description: 'Powerful detergent, 1kg pack', price: 145, mrp: 175, unit: '1 kg', cat: 'household', img: 'photo-1610557892470-55d9e80c0bce' },
  { name: 'Vim Dishwash Liquid Gel', description: 'Dishwash liquid gel, 750ml bottle', price: 175, mrp: 199, unit: '750 ml', cat: 'household', img: 'photo-1585670210693-eb806761ea4a' },
  { name: 'Colgate Strong Teeth Toothpaste', description: 'Toothpaste, 200g pack', price: 95, mrp: 110, unit: '200 g', cat: 'household', img: 'photo-1559591914-86f7d3d2e0b1' },
  { name: 'Lifebuoy Soap - Total', description: 'Germ protection soap, 125g (pack of 4)', price: 130, mrp: 160, unit: '500 g', cat: 'household', img: 'photo-1607006344380-b6775a0824a9' },
  { name: 'Harpic Toilet Cleaner', description: 'Original toilet cleaner, 1L bottle', price: 99, mrp: 115, unit: '1 L', cat: 'household', img: 'photo-1585421514738-01798e348b17' },
  { name: 'Lizol Floor Cleaner', description: 'Citrus floor cleaner, 975ml bottle', price: 175, mrp: 199, unit: '975 ml', cat: 'household', img: 'photo-1585421514738-01798e348b17' },
]

async function main() {
  console.log('Seeding Neon database...')

  // Create admin (with hashed password) — enforce 2-admin limit
  const adminCount = await db.admin.count()
  const existingAdmin = await db.admin.findFirst({ where: { username: 'admin' } })
  if (!existingAdmin && adminCount < 2) {
    const hashed = await hashPassword('mehta123')
    await db.admin.create({
      data: { username: 'admin', passwordHash: hashed, name: 'Mehta Admin' },
    })
    console.log('Admin user created (username: admin)')
  } else if (existingAdmin) {
    console.log('Admin user already exists, skipping')
  } else {
    console.log(`Admin limit (2) reached, skipping admin creation`)
  }

  // Create categories
  for (const c of CATEGORIES) {
    const existing = await db.category.findFirst({ where: { slug: c.slug } })
    if (!existing) {
      await db.category.create({ data: { name: c.name, slug: c.slug, icon: c.icon } })
    }
  }
  console.log('Categories ready')

  // Create products
  let productCount = 0
  for (const p of PRODUCTS) {
    const category = await db.category.findFirst({ where: { slug: p.cat } })
    if (!category) continue
    const existing = await db.product.findFirst({ where: { name: p.name } })
    if (existing) continue
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
    productCount++
  }
  console.log(`Seeded ${productCount} products`)

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
  console.log('Settings ready')

  console.log('Neon seed completed!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
