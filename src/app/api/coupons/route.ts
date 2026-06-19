import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// GET: List all coupons (admin only)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  const coupons = await db.coupon.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ coupons })
}

// POST: Create a new coupon (admin only)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const { code, description, discountType, discountValue, minOrderValue, maxUsage, expiryDate, isActive } = body

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Code, discountType, and discountValue are required' }, { status: 400 })
    }

    const upperCode = code.toUpperCase().trim()
    if (!/^[A-Z0-9]{3,20}$/.test(upperCode)) {
      return NextResponse.json({ error: 'Code must be 3-20 alphanumeric characters (A-Z, 0-9)' }, { status: 400 })
    }

    if (!['FIXED', 'PERCENTAGE'].includes(discountType)) {
      return NextResponse.json({ error: 'discountType must be FIXED or PERCENTAGE' }, { status: 400 })
    }

    const value = parseFloat(discountValue)
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: 'discountValue must be a positive number' }, { status: 400 })
    }

    if (discountType === 'PERCENTAGE' && value > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100%' }, { status: 400 })
    }

    // Check if code already exists
    const existing = await db.coupon.findFirst({ where: { code: upperCode } })
    if (existing) {
      return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 })
    }

    const coupon = await db.coupon.create({
      data: {
        code: upperCode,
        description: description || '',
        discountType,
        discountValue: value,
        minOrderValue: parseFloat(minOrderValue) || 0,
        maxUsage: parseInt(maxUsage) || 0,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
    })

    return NextResponse.json({ coupon })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
