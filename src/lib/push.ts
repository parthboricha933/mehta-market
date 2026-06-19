// Push notification helper with delivery logging.
// Uses Web Push (VAPID) as primary mechanism — works even when tab is closed.
// If Firebase credentials are configured, also sends via FCM for maximum reliability.

import webpush from 'web-push'
import { db } from '@/lib/db'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@mehtasupermarket.com'

// Firebase FCM credentials (optional — if set, FCM is used as an additional channel)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || ''
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''

let vapidConfigured = false
function configureVapid() {
  if (vapidConfigured) return
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidConfigured = true
    console.log('[push] VAPID configured')
  }
}

let fcmInitialized = false
let firebaseAdmin: any = null
async function initFCM() {
  if (fcmInitialized) return firebaseAdmin
  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) return null

  try {
    const admin = await import('firebase-admin/app')
    const messaging = await import('firebase-admin/messaging')

    if (!firebaseAdmin) {
      const cert = admin.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      })
      admin.initializeApp({ credential: cert })
      firebaseAdmin = messaging.getMessaging()
    }
    fcmInitialized = true
    console.log('[push] FCM initialized')
    return firebaseAdmin
  } catch (e: any) {
    console.error('[push] FCM init failed:', e.message?.slice(0, 100))
    return null
  }
}

export interface PushOrderPayload {
  orderId: string
  orderNumber: string
  customerName: string
  total: number
  itemCount: number
}

/**
 * Send push notification to ALL subscribed admin devices.
 * Uses both Web Push (VAPID) and FCM (if configured) for maximum reliability.
 * Logs delivery status for debugging.
 */
export async function sendOrderPushNotification(payload: PushOrderPayload): Promise<void> {
  console.log('[push] Sending notification for order:', payload.orderNumber)

  // --- Web Push (VAPID) ---
  configureVapid()
  if (vapidConfigured) {
    await sendViaWebPush(payload)
  }

  // --- FCM (if configured) ---
  const fcm = await initFCM()
  if (fcm) {
    await sendViaFCM(fcm, payload)
  }
}

async function sendViaWebPush(payload: PushOrderPayload): Promise<void> {
  try {
    const subscriptions = await db.pushSubscription.findMany()
    if (subscriptions.length === 0) {
      console.log('[push] No VAPID subscriptions — skipping web push')
      return
    }

    const pushPayload = JSON.stringify({
      title: '🛒 New Order Received!',
      body: `Order ${payload.orderNumber}\n${payload.customerName} • ₹${payload.total.toFixed(0)}\n${payload.itemCount} ${payload.itemCount === 1 ? 'item' : 'items'}`,
      tag: `order-${payload.orderNumber}`,
      data: { url: `/?view=admin&tab=orders&order=${payload.orderId}`, orderId: payload.orderId },
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })

    console.log(`[push] VAPID: sending to ${subscriptions.length} device(s)`)

    let succeeded = 0
    let failed = 0

    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          expirationTime: sub.expirationTime ? sub.expirationTime.getTime() : null,
          keys: JSON.parse(sub.keys),
        }
        await webpush.sendNotification(subscription, pushPayload)
        succeeded++
        console.log('[push] VAPID ✅ delivered to:', sub.endpoint.slice(-30))
      } catch (err: any) {
        failed++
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired — delete it
          console.log('[push] VAPID ❌ expired, deleting:', sub.endpoint.slice(-30))
          await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {})
        } else {
          console.error('[push] VAPID ❌ failed:', err.statusCode, err.message?.slice(0, 80))
        }
      }
    }

    console.log(`[push] VAPID result: ${succeeded} delivered, ${failed} failed`)
  } catch (e: any) {
    console.error('[push] VAPID error:', e.message)
  }
}

async function sendViaFCM(fcm: any, payload: PushOrderPayload): Promise<void> {
  try {
    // FCM sends to all devices subscribed to the "admin" topic
    const message = {
      notification: {
        title: '🛒 New Order Received!',
        body: `Order ${payload.orderNumber} • ${payload.customerName} • ₹${payload.total.toFixed(0)}`,
      },
      data: {
        url: `/?view=admin&tab=orders&order=${payload.orderId}`,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        customerName: payload.customerName,
        total: payload.total.toString(),
      },
      topic: 'admin',
    }

    const response = await fcm.send(message)
    console.log('[push] FCM ✅ sent:', response)
  } catch (e: any) {
    console.error('[push] FCM ❌ failed:', e.message?.slice(0, 100))
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

export function isFCMConfigured(): boolean {
  return !!(FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY)
}
