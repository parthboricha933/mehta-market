import { NextRequest, NextResponse } from 'next/server'
import { verifySession, refreshSessionToken, setSessionCookie, clearSessionCookie } from '@/lib/auth'

// POST: Verify the current admin session.
// - On valid session: refresh lastActivity (sliding expiration) and return admin info.
// - On expired session (30-min inactivity or 7-day max lifetime): return 401 with `expired: true`
//   and a `reason` field so the client can show the correct "session expired" message.
// - On missing/invalid token: return 401 without `expired` (treat as not-logged-in).
export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const result = await verifySession(token)
  if (!result.valid) {
    // Clear the invalid/expired cookie
    const res = NextResponse.json(
      result.expired
        ? { authenticated: false, expired: true, reason: result.reason }
        : { authenticated: false },
      { status: 401 }
    )
    clearSessionCookie(res)
    return res
  }

  // Refresh session (sliding expiration) — issues a new cookie with updated lastActivity
  const newToken = refreshSessionToken(result.payload!)
  const res = NextResponse.json({
    authenticated: true,
    admin: result.admin,
  })
  setSessionCookie(res, newToken)
  return res
}

// DELETE: Logout — clear the session cookie.
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  clearSessionCookie(res)
  return res
}
