import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// PUT: Update a coupon (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    const body = await req.json()
    const { code, description, discountType, discountValue, minOrderValue, maxUsage, expiryDate, isActive } = body

    const data: any = {}
    if (code !== undefined) {
      const upperCode = code.toUpperCase().trim()
      if (!/^[A-Z0-9]{3,20}$/.test(upperCode)) {
        return NextResponse.json({ error: 'Code must be 3-20 alphanumeric characters' }, { status: 400 })
      }
      data.code = upperCode
    }
    if (description !== undefined) data.description = description
    if (discountType !== undefined) {
      if (!['FIXED', 'PERCENTAGE'].includes(discountType)) {
        return NextResponse.json({ error: 'discountType must be FIXED or PERCENTAGE' }, { status: 400 })
      }
      data.discountType = discountType
    }
    if (discountValue !== undefined) {
      const value = parseFloat(discountValue)
      if (isNaN(value) || value <= 0) {
        return NextResponse.json({ error: 'discountValue must be positive' }, { status: 400 })
      }
      if (data.discountType === 'PERCENTAGE' && value > 100) {
        return NextResponse.json({ error: 'Percentage cannot exceed 100%' }, { status: 400 })
      }
      data.discountValue = value
    }
    if (minOrderValue !== undefined) data.minOrderValue = parseFloat(minOrderValue) || 0
    if (maxUsage !== undefined) data.maxUsage = parseInt(maxUsage) || 0
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (isActive !== undefined) data.isActive = isActive

    const coupon = await db.coupon.update({ where: { id }, data })
    return NextResponse.json({ coupon })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Delete a coupon (admin only)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    await db.coupon.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
