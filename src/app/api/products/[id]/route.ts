import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await db.product.findUnique({
    where: { id },
    include: { category: true },
  })
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ product: { ...product, images: JSON.parse(product.images || '[]') } })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const { name, description, price, mrp, unit, images, categoryId, stock, isActive } = body
    const product = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(price !== undefined && { price: parseFloat(price) }),
        ...(mrp !== undefined && { mrp: mrp ? parseFloat(mrp) : null }),
        ...(unit !== undefined && { unit }),
        ...(images !== undefined && { images: JSON.stringify(images) }),
        ...(categoryId !== undefined && { categoryId }),
        ...(stock !== undefined && { stock: parseInt(stock) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { category: true },
    })
    return NextResponse.json({ product: { ...product, images: JSON.parse(product.images || '[]') } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await db.product.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
