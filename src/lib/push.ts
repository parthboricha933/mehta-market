// Push notification helper — sends ONLY to the currently logged-in admin device.
// Uses the session manager to find the active device's push subscription.
// Old/logged-out devices do NOT receive notifications.

import webpush from 'web-push'
import { db } from '@/lib/db'
import { getActiveDevicePush } from '@/lib/session-manager'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@mehtasupermarket.com'

// Firebase FCM (optional — for maximum reliability)
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
 * Send push notification to the ACTIVE admin device ONLY.
 * If no device is active (admin logged out, or no push subscription registered),
 * the notification is skipped — old devices do NOT receive it.
 */
export async function sendOrderPushNotification(payload: PushOrderPayload): Promise<void> {
  console.log('[push] Sending notification for order:', payload.orderNumber)

  // --- Send to active device via Web Push (VAPID) ---
  configureVapid()
  if (vapidConfigured) {
    await sendToActiveDevice(payload)
  }

  // --- Also send via FCM if configured (for Android/PWA background) ---
  const fcm = await initFCM()
  if (fcm) {
    await sendViaFCM(fcm, payload)
  }
}

/**
 * Send Web Push to the ACTIVE device only.
 * Uses session-manager to get the push subscription for the currently logged-in device.
 */
async function sendToActiveDevice(payload: PushOrderPayload): Promise<void> {
  const activeDevice = await getActiveDevicePush()
  if (!activeDevice) {
    console.log('[push] No active device with push subscription — skipping (admin not logged in or no push permission)')
    return
  }

  const pushPayload = JSON.stringify({
    title: '🔔 New Order Received',
    body: `Order: ${payload.orderNumber}\nCustomer: ${payload.customerName}\nAmount: ₹${payload.total.toFixed(0)}`,
    tag: `order-${payload.orderNumber}`,
    data: {
      url: `/?view=admin&tab=orders&order=${payload.orderId}`,
      orderId: payload.orderId,
    },
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
  })

  try {
    const subscription = {
      endpoint: activeDevice.endpoint,
      expirationTime: activeDevice.expirationTime,
      keys: activeDevice.keys,
    }
    await webpush.sendNotification(subscription, pushPayload)
    console.log('[push] ✅ Delivered to active device:', activeDevice.endpoint.slice(-30))
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log('[push] ❌ Active device subscription expired — clearing')
      // The subscription is invalid — the browser will re-subscribe on next visit
    } else {
      console.error('[push] ❌ Failed:', err.statusCode, err.message?.slice(0, 80))
    }
  }
}

/**
 * Send via FCM to the "admin" topic.
 * Only devices subscribed to this topic receive it.
 * On login, the device subscribes to the "admin" topic.
 * On logout, the device unsubscribes.
 */
async function sendViaFCM(fcm: any, payload: PushOrderPayload): Promise<void> {
  try {
    const message = {
      notification: {
        title: '🔔 New Order Received',
        body: `Order: ${payload.orderNumber}\nCustomer: ${payload.customerName}\nAmount: ₹${payload.total.toFixed(0)}`,
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
