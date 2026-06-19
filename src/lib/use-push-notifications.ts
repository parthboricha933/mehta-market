'use client'

// Hook that manages PWA push notifications for admin dashboard.
// 1. Registers the service worker (/sw.js)
// 2. Requests notification permission
// 3. Subscribes to push service using VAPID public key
// 4. Saves subscription to /api/admin/subscribe
// 5. Also shows local notifications via SW when SSE events arrive and page is hidden

import { useEffect, useRef } from 'react'

export function usePushNotifications(enabled: boolean) {
  const swRef = useRef<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    let cancelled = false

    async function setup() {
      try {
        // 1. Register service worker
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        swRef.current = registration
        console.log('[push] Service worker registered')

        // Wait for the SW to be active
        if (registration.active) {
          await subscribeToPush(registration)
        } else {
          // Wait for it to activate
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            subscribeToPush(registration)
          })
        }
      } catch (e: any) {
        console.error('[push] SW registration failed:', e.message)
      }
    }

    async function subscribeToPush(registration: ServiceWorkerRegistration) {
      if (cancelled) return
      try {
        // 2. Check if push is supported
        if (!('PushManager' in window)) {
          console.warn('[push] Push not supported in this browser')
          return
        }

        // 3. Check existing subscription
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          console.log('[push] Already subscribed')
          await saveSubscription(existing)
          return
        }

        // 4. Get VAPID public key
        const vapidRes = await fetch('/api/admin/vapid-key')
        const vapidData = await vapidRes.json()
        if (!vapidData?.publicKey) {
          console.warn('[push] VAPID not configured on server — push notifications disabled')
          return
        }

        // 5. Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[push] Notification permission not granted')
          return
        }
        console.log('[push] Notification permission granted')

        // 6. Subscribe to push service
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
        })
        console.log('[push] Subscribed to push service')

        // 7. Save subscription to server
        await saveSubscription(subscription)
      } catch (e: any) {
        console.error('[push] Subscribe failed:', e.message)
      }
    }

    async function saveSubscription(subscription: PushSubscription) {
      try {
        const sub = subscription.toJSON()
        await fetch('/api/admin/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: sub.keys,
            expirationTime: sub.expirationTime,
          }),
        })
        console.log('[push] Subscription saved to server')
      } catch (e: any) {
        console.error('[push] Failed to save subscription:', e.message)
      }
    }

    setup()

    return () => {
      cancelled = true
    }
  }, [enabled])

  // Return a function to show a local notification via SW
  // (used when SSE event arrives and the page is hidden)
  return {
    showLocalNotification: async (payload: { title: string; body: string; tag?: string; orderId?: string }) => {
      try {
        const reg = swRef.current || (await navigator.serviceWorker.getRegistration())
        if (reg && Notification.permission === 'granted') {
          const orderId = payload.orderId
          reg.showNotification(payload.title, {
            body: payload.body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: payload.tag || `order-${orderId || 'new'}`,
            renotify: true,
            data: { url: `/?view=admin&tab=orders&order=${orderId || ''}`, orderId },
            vibrate: [200, 100, 200],
            actions: [
              { action: 'view', title: 'View Order' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          })
          console.log('[push] Local notification shown via SW')
        }
      } catch (e: any) {
        console.error('[push] Local notification failed:', e.message)
      }
    },
  }
}

// Convert VAPID public key from Base64URL to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
