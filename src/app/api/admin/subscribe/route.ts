// POST: Save a push subscription for the logged-in admin.
// DELETE: Remove a push subscription.
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

export const runtime = 'nodejs'

// POST: Subscribe (called by the browser after getting permission)
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    // Get the admin ID from the session token
    const token = req.cookies.get('mehta_admin_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Parse the session to get adminId
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    const adminId = payload.adminId

    const body = await req.json()
    const { endpoint, keys, expirationTime } = body

    if (!endpoint || !keys) {
      return NextResponse.json({ error: 'endpoint and keys are required' }, { status: 400 })
    }

    // Upsert the subscription (unique constraint on [adminId, endpoint])
    const subscription = await db.pushSubscription.upsert({
      where: {
        adminId_endpoint: { adminId, endpoint },
      },
      update: {
        keys: JSON.stringify(keys),
        expirationTime: expirationTime ? new Date(expirationTime) : null,
      },
      create: {
        adminId,
        endpoint,
        keys: JSON.stringify(keys),
        expirationTime: expirationTime ? new Date(expirationTime) : null,
      },
    })

    console.log('[push] Subscription saved for admin:', adminId, '| endpoint:', endpoint.slice(-30))
    return NextResponse.json({ success: true, id: subscription.id })
  } catch (e: any) {
    console.error('[push] Subscribe failed:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE: Unsubscribe (called when the admin revokes permission or logs out)
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    const token = req.cookies.get('mehta_admin_token')?.value
    if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded)
    const adminId = payload.adminId

    const { searchParams } = new URL(req.url)
    const endpoint = searchParams.get('endpoint')

    if (endpoint) {
      await db.pushSubscription.deleteMany({
        where: { adminId, endpoint },
      })
    } else {
      // Delete all subscriptions for this admin
      await db.pushSubscription.deleteMany({
        where: { adminId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
