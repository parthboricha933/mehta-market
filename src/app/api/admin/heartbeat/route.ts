// Admin heartbeat endpoint — called every 30 seconds by the admin dashboard
// to keep the single-session lock alive. If no heartbeat is received for
// 2 minutes, the session is auto-released (allowing another admin to log in).
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { heartbeatSession } from '@/lib/session-manager'

export const runtime = 'nodejs'
export const maxDuration = 10

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) {
    return NextResponse.json({ ok: false, reason: 'no_token' }, { status: 401 })
  }

  const result = await verifySession(token)
  if (!result.valid) {
    return NextResponse.json({ ok: false, reason: 'session_expired' }, { status: 401 })
  }

  const updated = await heartbeatSession(token)
  if (!updated) {
    // Session was taken over by another admin, or lost
    return NextResponse.json({ ok: false, reason: 'session_taken' }, { status: 403 })
  }

  return NextResponse.json({ ok: true, timestamp: Date.now() })
}
