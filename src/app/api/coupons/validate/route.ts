import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Validate a coupon code against the current cart subtotal.
// Public endpoint (no admin auth required) — customers use this at checkout.
// Returns the discount amount if valid, or an error message if invalid.
export async function POST(req: NextRequest) {
  try {
    const { code, subtotal } = await req.json()

    if (!code || subtotal === undefined) {
      return NextResponse.json({ error: 'Code and subtotal are required' }, { status: 400 })
    }

    const upperCode = code.toUpperCase().trim()
    const subtotalNum = parseFloat(subtotal)

    const coupon = await db.coupon.findFirst({ where: { code: upperCode } })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid coupon code' })
    }

    if (!coupon.isActive) {
      return NextResponse.json({ valid: false, error: 'This coupon is no longer active' })
    }

    // Check expiry
    if (coupon.expiryDate && new Date() > coupon.expiryDate) {
      return NextResponse.json({ valid: false, error: 'This coupon has expired' })
    }

    // Check usage limit
    if (coupon.maxUsage > 0 && coupon.usageCount >= coupon.maxUsage) {
      return NextResponse.json({ valid: false, error: 'This coupon has reached its usage limit' })
    }

    // Check minimum order value
    if (subtotalNum < coupon.minOrderValue) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order value of ₹${coupon.minOrderValue.toFixed(0)} required for this coupon`,
      })
    }

    // Calculate discount
    let discount = 0
    if (coupon.discountType === 'FIXED') {
      discount = coupon.discountValue
    } else if (coupon.discountType === 'PERCENTAGE') {
      discount = (subtotalNum * coupon.discountValue) / 100
    }

    // Discount cannot exceed the subtotal
    if (discount > subtotalNum) discount = subtotalNum

    return NextResponse.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        description: coupon.description,
      },
      discount,
      discountedTotal: subtotalNum - discount,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
