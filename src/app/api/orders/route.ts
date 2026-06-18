import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyNewOrder } from '@/lib/notifications/whatsapp'

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

    // --- Real-time admin notification (non-blocking, fire-and-forget) ---
    // Broadcast to all connected admin dashboards via the WebSocket mini-service.
    // Failures are silently ignored so they never affect order creation.
    try {
      const event = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        mobile: order.mobile,
        address: order.address,
        total: order.total,
        itemCount: order.items.length,
        createdAt: order.createdAt.toISOString(),
      }
      // Internal call to the mini-service. Use localhost directly since this is
      // server-to-server within the same sandbox (not subject to the XTransformPort
      // gateway rule which only applies to browser-initiated requests).
      fetch('http://localhost:3003/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(() => {})
    } catch {
      // swallow — never affect order creation
    }

    // --- WhatsApp notification scaffold (non-blocking, fire-and-forget) ---
    // Currently a stub (logs only). When WhatsApp credentials are configured,
    // this will send a real message to the shop admin without any code changes here.
    try {
      // Look up admin WhatsApp number from shop_info settings (best-effort).
      const shopInfoSetting = await db.setting.findFirst({ where: { key: 'shop_info' } })
      let adminWhatsApp: string | undefined
      if (shopInfoSetting) {
        try {
          const parsed = JSON.parse(shopInfoSetting.value)
          adminWhatsApp = parsed?.whatsapp
        } catch {}
      }
      // Fire-and-forget; notifyNewOrder itself swallows errors.
      notifyNewOrder(
        {
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          mobile: order.mobile,
          address: order.address,
          total: order.total,
          items: order.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
        },
        adminWhatsApp,
      ).catch(() => {})
    } catch {
      // swallow
    }

    return NextResponse.json({ order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
