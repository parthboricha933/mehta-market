import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyNewOrder } from '@/lib/notifications/whatsapp'
import { ensureSeeded } from '@/lib/auto-seed'
import { notifyNewOrder as pgNotifyNewOrder } from '@/lib/pg-helper'

export async function GET(req: NextRequest) {
  await ensureSeeded()
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
  await ensureSeeded()
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

    console.log('[orders] Saving order to database:', orderNumber)

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

    console.log('[orders] Order saved to database:', order.orderNumber, '| ID:', order.id)

    // Update soldCount for each product
    for (const item of items) {
      await db.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      })
    }

    // --- REAL-TIME NOTIFICATION via Postgres LISTEN/NOTIFY ---
    // This is the PRIMARY real-time mechanism. It works on both sandbox AND Vercel.
    // After saving the order, we issue a NOTIFY on the 'new_order' channel.
    // The /api/admin/events SSE endpoint is LISTENing and pushes the event to all
    // connected admin dashboards instantly.
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
      console.log('[orders] Emitting NOTIFY new_order for:', order.orderNumber)
      // This issues: NOTIFY new_order, '<json>'
      // Non-blocking but we await it to ensure the notification is sent before responding
      await pgNotifyNewOrder(event)
      console.log('[orders] NOTIFY sent successfully for:', order.orderNumber)
    } catch (e: any) {
      console.error('[orders] NOTIFY failed (non-fatal):', e.message)
      // Non-fatal — order is already saved. SSE catch-up will handle it on next reconnect.
    }

    // --- WhatsApp notification scaffold (non-blocking, fire-and-forget) ---
    try {
      const shopInfoSetting = await db.setting.findFirst({ where: { key: 'shop_info' } })
      let adminWhatsApp: string | undefined
      if (shopInfoSetting) {
        try {
          const parsed = JSON.parse(shopInfoSetting.value)
          adminWhatsApp = parsed?.whatsapp
        } catch {}
      }
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
