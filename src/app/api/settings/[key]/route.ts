import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { ensureSeeded } from '@/lib/auto-seed'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  await ensureSeeded()
  const { key } = await params
  const setting = await db.setting.findFirst({ where: { key } })
  if (!setting) return NextResponse.json({ value: null })
  try {
    return NextResponse.json({ value: JSON.parse(setting.value) })
  } catch {
    return NextResponse.json({ value: setting.value })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const guard = await requireAdmin(req)
  if (guard) return guard
  try {
    const { value } = await req.json()
    const setting = await db.setting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    })
    return NextResponse.json({ setting })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
