import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const [adminId] = decoded.split(':')
    const admin = await db.admin.findUnique({ where: { id: adminId } })
    if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 })
    return NextResponse.json({ authenticated: true, admin: { id: admin.id, username: admin.username, name: admin.name } })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('mehta_admin_token')
  return res
}
