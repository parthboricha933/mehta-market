'use client'

// React hook that connects the admin dashboard to the SSE (Server-Sent Events)
// endpoint for real-time order notifications.
//
// This replaces the Socket.IO mini-service with a Vercel-compatible solution.
// SSE works natively on Vercel (no external mini-service needed) and uses
// Postgres LISTEN/NOTIFY for TRUE real-time push (not polling).
//
// Connection: EventSource('/api/admin/events')
// The SSE endpoint:
//   1. Verifies admin session (via httpOnly cookie — sent automatically)
//   2. Sends catch-up events (orders from last 60 seconds)
//   3. LISTENs on Postgres 'new_order' channel
//   4. Streams new-order events to the admin in real-time
//   5. Auto-reconnects via EventSource when the connection drops

import { useEffect, useRef } from 'react'
import { useAdmin } from '@/lib/stores/admin'
import { playNotificationSound } from '@/lib/sound'

export interface NewOrderEvent {
  orderId: string
  orderNumber: string
  customerName: string
  mobile: string
  address: string
  total: number
  itemCount: number
  createdAt: string
  _catchUp?: boolean // true for catch-up events (skip popup/sound)
}

interface UseAdminSSEOptions {
  onNewOrder?: (event: NewOrderEvent) => void
  enabled?: boolean
}

export function useAdminSSE({ onNewOrder, enabled = true }: UseAdminSSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onNewOrderRef = useRef(onNewOrder)

  // Update the ref inside an effect (not during render)
  useEffect(() => {
    onNewOrderRef.current = onNewOrder
  }, [onNewOrder])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return
    if (!('EventSource' in window)) {
      console.warn('[sse] EventSource not supported in this browser')
      return
    }

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      console.log('[sse] Opening EventSource connection to /api/admin/events')

      const eventSource = new EventSource('/api/admin/events', { withCredentials: true })
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        console.log('[sse] ✅ Connection opened — listening for new orders')
      }

      eventSource.onmessage = (e) => {
        // Ignore comments (heartbeats start with ':')
        if (e.data.startsWith(':')) return

        try {
          const event: NewOrderEvent = JSON.parse(e.data)
          console.log('[sse] 📨 Received event:', event.orderNumber, '| catchUp:', !!event._catchUp)

          // Skip popup/sound for catch-up events (only show for live new orders)
          if (!event._catchUp) {
            // Play notification sound
            try {
              playNotificationSound()
              console.log('[sse] 🔊 Played notification sound')
            } catch (e) {
              console.warn('[sse] Sound failed:', e)
            }

            // Increment badge counter
            useAdmin.getState().incrementNewOrder()
            console.log('[sse] 🔔 Badge counter incremented')

            // Invoke the onNewOrder callback (for popup)
            onNewOrderRef.current?.(event)
            console.log('[sse] ✅ onNewOrder callback invoked')
          }

          // ALWAYS publish to the store (even for catch-up events)
          // so the Orders page can update. The dedup logic in AdminOrders
          // prevents duplicate entries.
          useAdmin.getState().publishNewOrderEvent(event)
          console.log('[sse] 📤 Published event to admin store (for Orders page + stats)')
        } catch (err) {
          console.error('[sse] Failed to parse event data:', err, '| raw:', e.data)
        }
      }

      eventSource.onerror = (e) => {
        console.warn('[sse] ⚠️ Connection error — EventSource will auto-reconnect')
        // EventSource auto-reconnects. We just log it.
        // If the connection is closed (not reconnecting), try manual reconnect after 3s
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('[sse] Connection closed — will retry in 3 seconds')
          eventSourceRef.current = null
          reconnectTimer = setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      console.log('[sse] Cleaning up — closing EventSource connection')
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [enabled])
}
