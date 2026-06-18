import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (status && status !== 'all') where.status = status.toUpperCase()
  const orders = await db.order.findMany({
    where,
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ orders })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { customerName, mobile, address, landmark, notes, items, subtotal, deliveryCharge, total } = body

    if (!customerName || !mobile || !address || !items?.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Delivery area restriction: Rajula only
    const addressLower = (address + ' ' + (landmark || '')).toLowerCase()
    if (!addressLower.includes('rajula')) {
      return NextResponse.json({
        error: 'Sorry, home delivery is available only within Rajula city. Please choose a different delivery option or pick up from our store.',
      }, { status: 400 })
    }

    const orderNumber = 'MSM' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 99)

    const order = await db.order.create({
      data: {
        orderNumber,
        customerName,
        mobile,
        address,
        landmark: landmark || '',
        notes: notes || '',
        subtotal: parseFloat(subtotal),
        deliveryCharge: parseFloat(deliveryCharge),
        total: parseFloat(total),
        status: 'PENDING',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
        },
      },
      include: { items: true },
    })

    // Update soldCount for each product
    for (const item of items) {
      await db.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      })
    }

    return NextResponse.json({ order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
