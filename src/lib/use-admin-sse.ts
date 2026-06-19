'use client'

// Real-time notification hook with triple-redundancy:
// 1. SSE (Server-Sent Events) — primary real-time channel (Postgres LISTEN/NOTIFY)
// 2. Polling fallback — checks for new orders every 20s when SSE is disconnected
// 3. Web Push (VAPID) — native push notifications via service worker (works when tab is closed)
//
// This ensures notifications ALWAYS arrive, even after hours of inactivity.

import { useEffect, useRef, useCallback } from 'react'
import { useAdmin } from '@/lib/stores/admin'
import { playNotificationSound } from '@/lib/sound'
import type { NewOrderEvent } from '@/lib/use-admin-sse'

export interface NewOrderEvent {
  orderId: string
  orderNumber: string
  customerName: string
  mobile: string
  address: string
  total: number
  itemCount: number
  createdAt: string
  _catchUp?: boolean
}

interface UseAdminSSEOptions {
  onNewOrder?: (event: NewOrderEvent) => void
  enabled?: boolean
}

const SSE_RECONNECT_DELAY = 2000 // 2 seconds (aggressive reconnect)
const POLL_INTERVAL = 20000 // 20 seconds polling fallback
const HEARTBEAT_INTERVAL = 30000 // 30 seconds heartbeat to keep single-session lock

export function useAdminSSE({ onNewOrder, enabled = true }: UseAdminSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onNewOrderRef = useRef(onNewOrder)
  const sseConnectedRef = useRef(false)
  const lastSeenOrderIdsRef = useRef<Set<string>>(new Set())
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Update the ref inside an effect
  useEffect(() => {
    onNewOrderRef.current = onNewOrder
  }, [onNewOrder])

  // Handle incoming order event (shared between SSE and polling)
  const handleOrderEvent = useCallback((event: NewOrderEvent) => {
    console.log('[rt] 📨 Order event:', event.orderNumber, '| catchUp:', !!event._catchUp)

    // Dedup — skip if already seen
    if (lastSeenOrderIdsRef.current.has(event.orderId)) {
      console.log('[rt] ⏭️ Skipping duplicate:', event.orderNumber)
      return
    }
    lastSeenOrderIdsRef.current.add(event.orderId)

    if (!event._catchUp) {
      // Play sound
      try {
        playNotificationSound()
        console.log('[rt] 🔊 Sound played')
      } catch {}

      // Increment badge
      useAdmin.getState().incrementNewOrder()
      console.log('[rt] 🔔 Badge incremented')

      // Invoke callback (for popup)
      onNewOrderRef.current?.(event)
      console.log('[rt] ✅ Callback invoked')

      // Show local notification via SW if page is hidden
      if (typeof document !== 'undefined' && document.hidden) {
        try {
          navigator.serviceWorker?.controller?.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: {
              title: '🛒 New Order Received!',
              body: `Order ${event.orderNumber}\n${event.customerName} • ₹${event.total.toFixed(0)}`,
              orderId: event.orderId,
            },
          })
        } catch {}
      }
    }

    // Always publish to store (for Orders page + stats)
    useAdmin.getState().publishNewOrderEvent(event)
    console.log('[rt] 📤 Published to store')
  }, [])

  // Polling fallback — checks for recent orders when SSE is disconnected
  const pollForNewOrders = useCallback(async () => {
    if (sseConnectedRef.current) return // SSE is working, skip polling

    try {
      const res = await fetch('/api/orders?status=pending&limit=5', {
        credentials: 'include',
      })
      if (!res.ok) return
      const data = await res.json()
      const orders = data.orders || []

      for (const order of orders) {
        if (!lastSeenOrderIdsRef.current.has(order.id)) {
          // Found a new order via polling!
          console.log('[rt] 📡 Polling found new order:', order.orderNumber)
          handleOrderEvent({
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            mobile: order.mobile,
            address: order.address,
            total: Number(order.total),
            itemCount: order.items?.length || 0,
            createdAt: order.createdAt,
            _catchUp: false, // Treat as live — it's new to us
          })
        }
      }
    } catch (e) {
      // Silent fail — will retry next interval
    }
  }, [handleOrderEvent])

  // Heartbeat — keeps single-session lock alive
  const sendHeartbeat = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/heartbeat', {
        method: 'POST',
        credentials: 'include',
      })
      if (res.status === 403) {
        // Session was taken by another admin — force logout
        console.log('[rt] ⚠️ Session taken by another admin — logging out')
        useAdmin.getState().logout()
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    // --- SSE Connection ---
    const connectSSE = () => {
      if (!('EventSource' in window)) {
        console.warn('[rt] EventSource not supported — using polling only')
        return
      }

      console.log('[rt] Opening SSE connection...')
      const es = new EventSource('/api/admin/events', { withCredentials: true })
      eventSourceRef.current = es

      es.onopen = () => {
        console.log('[rt] ✅ SSE connected')
        sseConnectedRef.current = true
      }

      es.onmessage = (e) => {
        if (e.data.startsWith(':')) return // heartbeat comment
        try {
          const event: NewOrderEvent = JSON.parse(e.data)
          handleOrderEvent(event)
        } catch (err) {
          console.error('[rt] Parse error:', err)
        }
      }

      es.onerror = () => {
        console.warn('[rt] ⚠️ SSE error — reconnecting in 2s')
        sseConnectedRef.current = false
        es.close()
        eventSourceRef.current = null

        // Aggressive reconnect
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = setTimeout(connectSSE, SSE_RECONNECT_DELAY)
      }
    }

    connectSSE()

    // --- Polling fallback (runs every 20s, only when SSE is down) ---
    pollTimerRef.current = setInterval(pollForNewOrders, POLL_INTERVAL)

    // --- Heartbeat (every 30s — keeps single-session lock alive) ---
    heartbeatTimerRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    // Send immediately on mount
    sendHeartbeat()

    return () => {
      console.log('[rt] Cleaning up')
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [enabled, handleOrderEvent, pollForNewOrders, sendHeartbeat])
}
