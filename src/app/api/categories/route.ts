import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { ensureSeeded } from '@/lib/auto-seed'

export async function GET() {
  await ensureSeeded()
  const categories = await db.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  return NextResponse.json({ categories })
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard
  try {
    const { name, slug, icon } = await req.json()
    if (!name || !slug) return NextResponse.json({ error: 'Name and slug required' }, { status: 400 })
    const category = await db.category.create({ data: { name, slug, icon } })
    return NextResponse.json({ category })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
