import { NextRequest, NextResponse } from 'next/server'
import { verifySession, refreshSessionToken, setSessionCookie, clearSessionCookie } from '@/lib/auth'
import { releaseSession, heartbeatSession, acquireSession, getActiveSession } from '@/lib/session-manager'
import { db } from '@/lib/db'

// POST: Verify the current admin session.
// - If cookie is valid: refresh session + re-acquire session lock if needed + send heartbeat
// - If cookie is invalid/expired: return 401
export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const result = await verifySession(token)
  if (!result.valid) {
    const res = NextResponse.json(
      result.expired
        ? { authenticated: false, expired: true, reason: result.reason }
        : { authenticated: false },
      { status: 401 }
    )
    clearSessionCookie(res)
    return res
  }

  // Check if the session manager session still exists.
  // If it was auto-cleaned (e.g. browser was closed for >30 min), re-acquire it.
  const activeSession = await getActiveSession()
  if (!activeSession) {
    // Session was cleaned up — re-acquire it automatically (cookie is still valid)
    console.log('[verify] Session lock missing — re-acquiring for admin:', result.admin?.username)
    const admin = await db.admin.findUnique({ where: { id: result.admin!.id } })
    if (admin) {
      await acquireSession(admin.id, admin.username, token)
    }
  } else {
    // Session exists — send heartbeat
    await heartbeatSession(token)
  }

  // Refresh session (sliding expiration)
  const newToken = refreshSessionToken(result.payload!)
  const res = NextResponse.json({
    authenticated: true,
    admin: result.admin,
  })
  setSessionCookie(res, newToken)
  return res
}

// DELETE: Logout — clear the session cookie + release the active admin session.
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (token) {
    await releaseSession(token)
  }
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}
