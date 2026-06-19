// POST: Register push subscription for the active admin device.
// The subscription is stored in the active session (not a separate table),
// so only the currently logged-in device receives notifications.
// When a new device logs in, the old device's subscription is replaced.
// When the admin logs out, the subscription is cleared.
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { registerDevicePush } from '@/lib/session-manager'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const session = await verifySession(token)
  if (!session.valid) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { endpoint, keys, expirationTime } = body

    if (!endpoint || !keys) {
      return NextResponse.json({ error: 'endpoint and keys are required' }, { status: 400 })
    }

    // Register this device's push subscription as the ACTIVE device
    const registered = await registerDevicePush(
      token,
      endpoint,
      JSON.stringify(keys),
      expirationTime ? new Date(expirationTime).getTime() : null,
    )

    if (!registered) {
      return NextResponse.json({ error: 'Session not found or token mismatch' }, { status: 403 })
    }

    console.log('[push] Device registered as active notification receiver')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[push] Subscribe failed:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Unsubscribe (called on logout or when push permission revoked)
export async function DELETE(req: NextRequest) {
  // On logout, the session is released which clears the push subscription.
  // This endpoint is a no-op for backward compatibility — the session manager
  // handles cleanup automatically.
  return NextResponse.json({ success: true })
}
