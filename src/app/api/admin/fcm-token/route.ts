// POST: Register/update FCM token for the active admin device.
// The FCM token is stored in the active session and used by the server
// to send push notifications ONLY to this device.
import { NextRequest, NextResponse } from 'next/server'
import { verifySession } from '@/lib/auth'
import { registerFCMToken } from '@/lib/session-manager'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const session = await verifySession(token)
  if (!session.valid) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  try {
    const { fcmToken } = await req.json()
    if (!fcmToken) {
      return NextResponse.json({ error: 'fcmToken is required' }, { status: 400 })
    }

    const registered = await registerFCMToken(token, fcmToken)
    if (!registered) {
      return NextResponse.json({ error: 'Session not found' }, { status: 403 })
    }

    console.log('[fcm] Token registered for active device:', fcmToken.substring(0, 30) + '...')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[fcm] Token registration failed:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Remove FCM token (on logout)
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('mehta_admin_token')?.value
  if (!token) return NextResponse.json({ success: true })

  await registerFCMToken(token, '')
  return NextResponse.json({ success: true })
}
