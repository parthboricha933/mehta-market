// Service Worker for Mehta Super Market
// Handles:
// 1. Push notifications (from web push service — works even when tab is closed)
// 2. Notification clicks (opens admin dashboard → Orders page → highlights new order)
// 3. Message-based notifications (from the page when tab is alive but hidden)

const CACHE_NAME = 'mehta-market-v1'
const OFFLINE_URL = '/'

// --- Install: pre-cache the app shell ---
self.addEventListener('install', (event) => {
  console.log('[sw] Installing service worker')
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL))
  )
})

// --- Activate: clean up old caches ---
self.addEventListener('activate', (event) => {
  console.log('[sw] Activating service worker')
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// --- Push: show notification when a push message arrives ---
self.addEventListener('push', (event) => {
  console.log('[sw] Push message received:', event.data?.text())

  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = { title: 'New Order', body: event.data?.text() || 'You have a new order' }
  }

  const title = payload.title || '🛒 New Order Received!'
  const options = {
    body: payload.body || 'A new order has been placed',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    tag: payload.tag || 'new-order',
    renotify: true,
    // Navigate to admin dashboard → Orders tab, with orderId for highlighting
    data: payload.data || { url: '/?view=admin&tab=orders' },
    requireInteraction: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

// --- Notification click: open/focus the app and navigate to admin orders page ---
// Behavior:
//   - If admin is logged in → open admin dashboard, Orders tab, highlight the order
//   - If admin is NOT logged in → open admin login page (after login, redirect to Orders)
//   - Never open the customer-facing website
self.addEventListener('notificationclick', (event) => {
  console.log('[sw] Notification clicked:', event.action)
  event.notification.close()

  if (event.action === 'dismiss') return

  // Build the target URL: always go to admin view with Orders tab
  // The orderId (if present) is used to highlight the specific order
  const orderId = event.notification.data?.orderId
  const targetUrl = orderId
    ? `/?view=admin&tab=orders&order=${orderId}`
    : '/?view=admin&tab=orders'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if one is open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'NAVIGATE', url: targetUrl })
          return client.focus()
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl)
    })
  )
})

// --- Message: handle messages from the page ---
self.addEventListener('message', (event) => {
  console.log('[sw] Message received from page:', event.data?.type)

  if (event.data?.type === 'SHOW_NOTIFICATION') {
    const payload = event.data.payload || {}
    const orderId = payload.orderId
    const title = payload.title || '🛒 New Order Received!'
    const options = {
      body: payload.body || 'A new order has been placed',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: 'new-order',
      renotify: true,
      data: { url: '/?view=admin&tab=orders', orderId: orderId },
      requireInteraction: false,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'view', title: 'View Order' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    }
    event.waitUntil(
      self.registration.showNotification(title, options)
    )
  }

  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// --- Fetch: basic caching strategy (network-first, fallback to cache) ---
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Skip API requests and Next.js internals
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone))
        }
        return response
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request).then((cached) => cached || caches.match(OFFLINE_URL))
      })
  )
})
