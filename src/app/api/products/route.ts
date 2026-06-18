import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { ensureSeeded } from '@/lib/auto-seed'

export async function GET(req: NextRequest) {
  await ensureSeeded()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')
  const activeOnly = searchParams.get('activeOnly') !== 'false'

  const where: any = {}
  if (activeOnly) where.isActive = true
  if (category && category !== 'all') {
    const cat = await db.category.findFirst({ where: { slug: category } })
    if (cat) where.categoryId = cat.id
  }
  if (search) {
    where.name = { contains: search }
  }

  const products = await db.product.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: parseInt(limit) } : {}),
  })

  const result = products.map((p) => ({
    ...p,
    images: JSON.parse(p.images || '[]'),
  }))

  return NextResponse.json({ products: result })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard
  try {
    const body = await req.json()
    const { name, description, price, mrp, unit, images, categoryId, stock, isActive } = body
    if (!name || !price || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const product = await db.product.create({
      data: {
        name,
        description: description || '',
        price: parseFloat(price),
        mrp: mrp ? parseFloat(mrp) : null,
        unit: unit || '',
        images: JSON.stringify(images || []),
        categoryId,
        stock: parseInt(stock) || 0,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { category: true },
    })
    return NextResponse.json({ product: { ...product, images: JSON.parse(product.images || '[]') } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
