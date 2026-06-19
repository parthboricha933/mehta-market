// Firebase Cloud Messaging Service Worker
// Handles push notifications when the browser/PWA is in the background or closed.
// Must be at the root scope to receive push events.
// 
// This file is imported by the main sw.js service worker.
// For FCM, Firebase automatically registers this as a separate SW if needed.

importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyAwC2865JnZ-REsUIugIMVCEVgLXX2gKU0",
  authDomain: "mehta-supermall.firebaseapp.com",
  projectId: "mehta-supermall",
  storageBucket: "mehta-supermall.firebasestorage.app",
  messagingSenderId: "896835776502",
  appId: "1:896835776502:web:b932dad9ba182151af21d7",
})

const messaging = firebase.messaging()

// Handle background messages (when tab is closed or minimized)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message:', payload)

  const notificationTitle = payload.notification?.title || '🔔 New Order Received'
  const notificationBody = payload.notification?.body || 'A new order has been placed'
  const orderId = payload.data?.orderId || ''

  const notificationOptions = {
    body: notificationBody,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `order-${orderId || 'new'}`,
    renotify: true,
    data: {
      url: `/?view=admin&tab=orders&order=${orderId}`,
      orderId: orderId,
    },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification clicked:', event.action)
  event.notification.close()
  if (event.action === 'dismiss') return

  const orderId = event.notification.data?.orderId
  const targetUrl = orderId
    ? `/?view=admin&tab=orders&order=${orderId}`
    : '/?view=admin&tab=orders'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
