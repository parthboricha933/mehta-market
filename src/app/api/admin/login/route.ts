import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  hashPassword, verifyPassword, isPasswordHashed, createSessionToken,
  setSessionCookie, type SessionPayload,
} from '@/lib/auth'
import { ensureSeeded } from '@/lib/auto-seed'

// Secure admin login: bcrypt-hashed password verification + session-based cookie.
export async function POST(req: NextRequest) {
  await ensureSeeded()
  try {
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }

    const admin = await db.admin.findFirst({ where: { username } })
    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Backward-compatibility: if the stored password is still plain text (e.g. older seed),
    // verify directly AND silently upgrade it to a bcrypt hash. This does NOT change the schema.
    let valid = false
    if (isPasswordHashed(admin.passwordHash)) {
      valid = await verifyPassword(password, admin.passwordHash)
    } else if (admin.passwordHash === password) {
      valid = true
      // Upgrade to hashed
      const hashed = await hashPassword(password)
      await db.admin.update({ where: { id: admin.id }, data: { passwordHash: hashed } })
    }

    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Build session payload with login time + last activity
    const now = Date.now()
    const payload: SessionPayload = {
      adminId: admin.id,
      loginAt: now,
      lastActivity: now,
      version: 1,
    }
    const token = createSessionToken(payload)

    const res = NextResponse.json({
      success: true,
      admin: { id: admin.id, username: admin.username, name: admin.name },
      token,
    })
    setSessionCookie(res, token)
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
