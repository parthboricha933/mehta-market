import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simple admin login (demo: stores auth in a cookie)
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()
    const admin = await db.admin.findFirst({ where: { username } })
    if (!admin || admin.passwordHash !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    // Generate a simple session token (in production use JWT/NextAuth)
    const token = Buffer.from(`${admin.id}:${Date.now()}`).toString('base64')
    const res = NextResponse.json({ success: true, admin: { id: admin.id, username: admin.username, name: admin.name }, token })
    res.cookies.set('mehta_admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
