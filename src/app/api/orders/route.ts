import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notifyNewOrder } from '@/lib/notifications/whatsapp'
import { ensureSeeded } from '@/lib/auto-seed'
import { notifyNewOrder as pgNotifyNewOrder } from '@/lib/pg-helper'
import { sendOrderPushNotification } from '@/lib/push'

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
    const { customerName, mobile, address, landmark, notes, items, subtotal, deliveryCharge, total, couponCode } = body

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

    // --- Coupon validation (if couponCode provided) ---
    let validatedCouponCode: string | null = null
    let couponDiscount = 0
    if (couponCode) {
      const upperCode = couponCode.toUpperCase().trim()
      const coupon = await db.coupon.findFirst({ where: { code: upperCode } })
      if (!coupon || !coupon.isActive) {
        return NextResponse.json({ error: 'Invalid or inactive coupon code' }, { status: 400 })
      }
      if (coupon.expiryDate && new Date() > coupon.expiryDate) {
        return NextResponse.json({ error: 'This coupon has expired' }, { status: 400 })
      }
      if (coupon.maxUsage > 0 && coupon.usageCount >= coupon.maxUsage) {
        return NextResponse.json({ error: 'This coupon has reached its usage limit' }, { status: 400 })
      }
      const subtotalNum = parseFloat(subtotal)
      if (subtotalNum < coupon.minOrderValue) {
        return NextResponse.json({
          error: `Minimum order value of ₹${coupon.minOrderValue.toFixed(0)} required for this coupon`,
        }, { status: 400 })
      }
      // Calculate discount
      if (coupon.discountType === 'FIXED') {
        couponDiscount = coupon.discountValue
      } else {
        couponDiscount = (subtotalNum * coupon.discountValue) / 100
      }
      if (couponDiscount > subtotalNum) couponDiscount = subtotalNum
      validatedCouponCode = upperCode
    }

    const orderNumber = 'MSM' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 99)

    console.log('[orders] Saving order to database:', orderNumber, '| coupon:', validatedCouponCode || 'none')

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
        couponCode: validatedCouponCode,
        couponDiscount,
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

    // Increment coupon usage count if a coupon was used
    if (validatedCouponCode) {
      try {
        await db.coupon.updateMany({
          where: { code: validatedCouponCode },
          data: { usageCount: { increment: 1 } },
        })
      } catch (e: any) {
        console.error('[orders] Failed to increment coupon usage:', e.message)
      }
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

    // --- PWA Push notification (non-blocking, fire-and-forget) ---
    // Sends a native push notification to all subscribed admin devices.
    // Works even when the browser tab is closed (uses Web Push API + VAPID).
    try {
      sendOrderPushNotification({
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        total: order.total,
        itemCount: order.items.length,
      }).catch(() => {})
    } catch {
      // swallow — push is best-effort
    }

    return NextResponse.json({ order })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
