import { NextRequest, NextResponse } from 'next/server'
import { verifySession, refreshSessionToken, setSessionCookie, clearSessionCookie } from '@/lib/auth'
import { releaseSession, heartbeatSession } from '@/lib/session-manager'

// POST: Verify the current admin session.
// - On valid session: refresh lastActivity (sliding expiration) + send heartbeat
// - On expired session: return 401 with `expired: true`
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

  // Send heartbeat to keep the single-session lock alive
  await heartbeatSession(token)

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
    // Release the active session so another admin can log in
    await releaseSession(token)
  }
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}
