// Service Worker for Mehta Super Market
// Handles:
// 1. Push notifications (Web Push VAPID + FCM if configured)
// 2. Notification clicks (opens admin dashboard → Orders page → highlights order)
// 3. Message-based local notifications (when tab is alive but hidden)

const CACHE_NAME = 'mehta-market-v1'
const OFFLINE_URL = '/'

// Import Firebase Messaging service worker for background push notifications
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

// Handle FCM background messages (when tab is closed/minimized)
messaging.onBackgroundMessage((payload) => {
  console.log('[sw] FCM background message:', payload)
  const notificationTitle = payload.notification?.title || '🔔 New Order Received'
  const notificationBody = payload.notification?.body || 'A new order has been placed'
  const orderId = payload.data?.orderId || ''

  self.registration.showNotification(notificationTitle, {
    body: notificationBody,
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
})

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// --- Push: show notification when a push message arrives ---
self.addEventListener('push', (event) => {
  console.log('[sw] Push received')

  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'New Order', body: event.data?.text() || 'You have a new order' }
  }

  // Handle FCM format (notification + data) vs Web Push format
  const title = payload.notification?.title || payload.title || '🔔 New Order Received'
  const body = payload.notification?.body || payload.body || 'A new order has been placed'
  const orderId = payload.data?.orderId || payload.orderId
  const targetUrl = orderId
    ? `/?view=admin&tab=orders&order=${orderId}`
    : '/?view=admin&tab=orders'

  const options = {
    body,
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || `order-${orderId || 'new'}`,
    renotify: true,
    data: { url: targetUrl, orderId },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// --- Notification click: open admin dashboard → Orders page ---
self.addEventListener('notificationclick', (event) => {
  console.log('[sw] Notification clicked:', event.action)
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

// --- Message: handle messages from the page ---
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {}
    const orderId = payload.orderId
    const title = payload.title || '🔔 New Order Received'
    const options = {
      body: payload.body || 'A new order has been placed',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: `order-${orderId || 'new'}`,
      renotify: true,
      data: { url: `/?view=admin&tab=orders&order=${orderId || ''}`, orderId },
      requireInteraction: false,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }
    event.waitUntil(self.registration.showNotification(title, options))
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// --- Fetch: network-first with cache fallback ---
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL)))
  )
})
