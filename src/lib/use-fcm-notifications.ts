'use client'

// FCM (Firebase Cloud Messaging) hook for admin push notifications.
// 1. Initializes Firebase Messaging
// 2. Requests notification permission
// 3. Gets the FCM token
// 4. Registers the token with the server (stored in active session)
// 5. Handles token refresh
// 6. Handles foreground messages (when tab is open)

import { useEffect, useRef } from 'react'
import { getFirebaseMessaging } from '@/lib/firebase-config'

export function useFCMNotifications(enabled: boolean) {
  const messagingRef = useRef<any>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    let cancelled = false
    let unregisterRefresh: (() => void) | null = null
    let unregisterMessage: (() => void) | null = null

    async function setupFCM() {
      try {
        // Dynamic import to avoid loading Firebase on every page
        const { getToken, onMessage, onTokenRefresh } = await import('firebase/messaging')

        const messaging = getFirebaseMessaging()
        if (!messaging) {
          console.warn('[fcm] Messaging not available')
          return
        }
        messagingRef.current = messaging

        // Request notification permission
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          console.warn('[fcm] Notification permission not granted')
          return
        }
        console.log('[fcm] Notification permission granted')

        // Get FCM token
        // The service worker must be registered at /firebase-messaging-sw.js
        // or the main /sw.js with Firebase importScripts
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
        await navigator.serviceWorker.ready

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BCcc3JpGsuzV7qJR4DgMUKvoDgz5RgEDj08EfbZWxVLXH66FeWqQZU_mpgEg6o1ZVLnDOB7ietMyaSlgKKFNdx0',
          serviceWorkerRegistration: registration,
        })

        if (cancelled) return

        if (token) {
          console.log('[fcm] Token obtained:', token.substring(0, 30) + '...')

          // Register token with server
          await fetch('/api/admin/fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ fcmToken: token }),
          })
          console.log('[fcm] Token registered with server')
        } else {
          console.warn('[fcm] No token received — permission may not be granted')
        }

        // Handle token refresh
        unregisterRefresh = onTokenRefresh(async () => {
          console.log('[fcm] Token refreshed — re-registering')
          const newToken = await getToken(messaging, {
            vapidKey: 'BCcc3JpGsuzV7qJR4DgMUKvoDgz5RgEDj08EfbZWxVLXH66FeWqQZU_mpgEg6o1ZVLnDOB7ietMyaSlgKKFNdx0',
            serviceWorkerRegistration: registration,
          })
          if (newToken) {
            await fetch('/api/admin/fcm-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ fcmToken: newToken }),
            })
            console.log('[fcm] Refreshed token registered')
          }
        })

        // Handle foreground messages (when tab is open)
        unregisterMessage = onMessage(messaging, (payload) => {
          console.log('[fcm] Foreground message:', payload)

          // Show a local notification via the service worker
          const orderId = payload.data?.orderId || ''
          const title = payload.notification?.title || '🔔 New Order Received'
          const body = payload.notification?.body || 'A new order has been placed'

          if (registration && Notification.permission === 'granted') {
            registration.showNotification(title, {
              body,
              icon: '/icons/icon-192.png',
              badge: '/icons/icon-192.png',
              tag: `order-${orderId || 'new'}`,
              renotify: true,
              data: { url: `/?view=admin&tab=orders&order=${orderId}`, orderId },
              vibrate: [200, 100, 200],
              actions: [
                { action: 'view', title: 'View Order' },
                { action: 'dismiss', title: 'Dismiss' },
              ],
            })
          }
        })
      } catch (e: any) {
        console.error('[fcm] Setup failed:', e.message?.slice(0, 100))
      }
    }

    setupFCM()

    return () => {
      cancelled = true
      if (unregisterRefresh) unregisterRefresh()
      if (unregisterMessage) unregisterMessage()
    }
  }, [enabled])
}
