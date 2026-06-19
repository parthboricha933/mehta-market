'use client'

// React hook that connects the admin dashboard to the order-notifications WebSocket
// mini-service. Listens for new-order events and invokes the provided callback.
//
// Connection URL uses XTransformPort=3003 so the gateway routes to the mini-service.
// Path is / (required by gateway).

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
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
}

interface UseAdminSocketOptions {
  onNewOrder?: (event: NewOrderEvent) => void
  enabled?: boolean
}

export function useAdminSocket({ onNewOrder, enabled = true }: UseAdminSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const onNewOrderRef = useRef(onNewOrder)

  // Update the ref inside an effect (not during render) so we always have the latest callback.
  useEffect(() => {
    onNewOrderRef.current = onNewOrder
  }, [onNewOrder])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    // Connect via the gateway. XTransformPort routes to the mini-service on port 3003.
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      // Authenticate as admin. The dashboard is only rendered when authenticated,
      // so this is safe; the server treats all connected admins as recipients.
      socket.emit('admin-auth', { token: 'dashboard' })
    })

    socket.on('auth-ok', () => {
      // connected and authenticated
    })

    socket.on('new-order', (event: NewOrderEvent) => {
      // Play sound + bump badge + invoke handler (existing behavior — unchanged)
      try {
        playNotificationSound()
      } catch {}
      useAdmin.getState().incrementNewOrder()
      onNewOrderRef.current?.(event)
      // ALSO publish to the shared admin store so other components (Orders list,
      // Overview stats) can subscribe and update themselves in real-time without
      // a page refresh. This is purely additive — no existing behavior is changed.
      useAdmin.getState().publishNewOrderEvent(event)
    })

    socket.on('disconnect', () => {
      // will auto-reconnect
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled])
}
