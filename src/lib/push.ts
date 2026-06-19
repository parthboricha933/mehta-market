// Web Push notification helper.
// Sends native push notifications to all subscribed admin devices.
// Works even when the browser tab is closed (uses the Web Push API + VAPID).
import webpush from 'web-push'
import { db } from '@/lib/db'

// VAPID keys are generated once and must stay the same across deployments.
// They're loaded from environment variables (set in Vercel project settings).
// If not set, push notifications are silently skipped (SSE notifications still work).
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@mehtasupermarket.com'

let configured = false
function configure() {
  if (configured) return
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    configured = true
    console.log('[push] VAPID configured — web push notifications enabled')
  } else {
    console.warn('[push] VAPID keys not set — web push notifications disabled (SSE still works)')
  }
}

export interface PushOrderPayload {
  orderNumber: string
  customerName: string
  total: number
  itemCount: number
}

/**
 * Send a push notification to ALL subscribed admin devices.
 * Called from /api/orders POST after an order is saved.
 * Failures are silently ignored (non-blocking).
 */
export async function sendOrderPushNotification(payload: PushOrderPayload): Promise<void> {
  configure()
  if (!configured) return // VAPID not configured — skip silently

  try {
    const subscriptions = await db.pushSubscription.findMany()
    if (subscriptions.length === 0) {
      console.log('[push] No subscriptions — skipping push notification')
      return
    }

    const pushPayload = JSON.stringify({
      title: '🛒 New Order Received!',
      body: `Order ${payload.orderNumber}\n${payload.customerName} • ₹${payload.total.toFixed(0)}\n${payload.itemCount} ${payload.itemCount === 1 ? 'item' : 'items'}`,
      tag: `order-${payload.orderNumber}`,
      data: { url: '/?view=admin' },
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })

    console.log(`[push] Sending push to ${subscriptions.length} subscription(s)`)

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ? sub.expirationTime.getTime() : null,
          keys: JSON.parse(sub.keys),
        }
        try {
          await webpush.sendNotification(subscription, pushPayload)
          console.log('[push] Sent to:', sub.endpoint.slice(-30))
        } catch (err: any) {
          // 410 = subscription expired/unsubscribed — delete it from DB
          if (err.statusCode === 410 || err.statusCode === 404) {
            console.log('[push] Subscription expired, deleting:', sub.endpoint.slice(-30))
            await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
          } else {
            console.error('[push] Failed to send:', err.statusCode, err.message?.slice(0, 100))
          }
        }
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    console.log(`[push] Sent ${succeeded}/${subscriptions.length} notifications`)
  } catch (e: any) {
    console.error('[push] sendOrderPushNotification failed:', e.message)
  }
}

/**
 * Get the VAPID public key for the frontend (to subscribe the browser).
 * Returns empty string if not configured.
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}
