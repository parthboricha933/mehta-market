// Push notification helper — sends to the active admin device ONLY.
// Primary channel: Firebase Cloud Messaging (FCM) — most reliable
// Fallback channel: Web Push (VAPID) — for browsers without FCM support

import webpush from 'web-push'
import { getActiveDevicePush, getActiveFCMToken } from '@/lib/session-manager'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@mehtasupermarket.com'

// Firebase FCM server-side credentials
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || ''
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || ''
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || ''

let vapidConfigured = false
function configureVapid() {
  if (vapidConfigured) return
  if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
    vapidConfigured = true
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
      // Check if app is already initialized
      try {
        firebaseAdmin = admin.getApp()
      } catch {
        const cert = admin.cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY,
        })
        admin.initializeApp({ credential: cert })
      }
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
 * Uses FCM as primary channel, VAPID Web Push as fallback.
 */
export async function sendOrderPushNotification(payload: PushOrderPayload): Promise<void> {
  console.log('[push] Sending notification for order:', payload.orderNumber)

  // --- Primary: FCM (Firebase Cloud Messaging) ---
  const fcm = await initFCM()
  if (fcm) {
    const sent = await sendViaFCM(fcm, payload)
    if (sent) {
      console.log('[push] ✅ FCM delivered — skipping VAPID')
      return // FCM succeeded — no need for VAPID fallback
    }
  }

  // --- Fallback: VAPID Web Push ---
  configureVapid()
  if (vapidConfigured) {
    await sendViaVapid(payload)
  }
}

/**
 * Send via FCM to the active device's FCM token.
 */
async function sendViaFCM(fcm: any, payload: PushOrderPayload): Promise<boolean> {
  const fcmToken = await getActiveFCMToken()
  if (!fcmToken) {
    console.log('[push] No FCM token for active device — trying VAPID fallback')
    return false
  }

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
      token: fcmToken, // Send to THIS specific device only
    }

    const response = await fcm.send(message)
    console.log('[push] FCM ✅ delivered to active device:', response)
    return true
  } catch (e: any) {
    console.error('[push] FCM ❌ failed:', e.message?.slice(0, 100))

    // If token is invalid, clear it so it gets re-registered on next visit
    if (e.code === 'messaging/invalid-registration-token' || e.code === 'messaging/registration-token-not-registered') {
      console.log('[push] FCM token invalid — will be re-registered on next dashboard mount')
    }
    return false
  }
}

/**
 * Fallback: Send via VAPID Web Push to the active device.
 */
async function sendViaVapid(payload: PushOrderPayload): Promise<void> {
  const activeDevice = await getActiveDevicePush()
  if (!activeDevice) {
    console.log('[push] No VAPID subscription for active device')
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
    console.log('[push] VAPID ✅ delivered to active device')
  } catch (err: any) {
    console.error('[push] VAPID ❌ failed:', err.statusCode, err.message?.slice(0, 80))
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY
}

export function isFCMConfigured(): boolean {
  return !!(FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY)
}
