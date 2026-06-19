// SSE (Server-Sent Events) endpoint for real-time admin notifications.
//
// This replaces the Socket.IO mini-service with a Vercel-compatible solution.
// Uses Postgres LISTEN/NOTIFY for TRUE real-time push (not polling).
//
// Flow:
// 1. Admin dashboard opens EventSource('/api/admin/events')
// 2. This endpoint verifies the admin session
// 3. Sends catch-up: any orders created in the last 60 seconds (so reconnects don't miss events)
// 4. Issues LISTEN new_order on a direct Postgres connection
// 5. When /api/orders POST saves an order, it issues NOTIFY new_order
// 6. This endpoint receives the notification and streams it to the admin via SSE
// 7. Heartbeat every 10 seconds keeps the connection alive
// 8. On Vercel, the function eventually times out (10s Hobby, 60s Pro) — EventSource auto-reconnects

import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifySession } from '@/lib/auth'
import { listenForNewOrders } from '@/lib/pg-helper'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 seconds (Pro plan); Hobby plan will timeout at 10s and EventSource reconnects

export async function GET(req: NextRequest) {
  console.log('[sse] GET /api/admin/events — new SSE connection')

  // Verify admin session
  const token = req.cookies.get('mehta_admin_token')?.value
  const session = await verifySession(token)
  if (!session.valid) {
    console.log('[sse] Unauthorized — no valid admin session')
    return new Response('Unauthorized', { status: 401 })
  }
  console.log('[sse] Admin authorized:', session.admin?.username)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let listener: { release: () => void } | null = null
      let closed = false

      const safeEnqueue = (data: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(data))
        } catch (e) {
          // Controller may be closed already
          closed = true
        }
      }

      const cleanup = () => {
        if (closed) return
        closed = true
        console.log('[sse] Cleaning up SSE connection')
        if (listener) {
          try { listener.release() } catch {}
          listener = null
        }
        try { controller.close() } catch {}
      }

      // Send initial connection confirmation
      safeEnqueue(': connected\n\n')
      console.log('[sse] Sent initial connection confirmation')

      // --- Catch-up: send orders from last 60 seconds ---
      // This ensures that if the SSE connection drops and reconnects, the admin
      // doesn't miss any orders that were placed during the disconnection.
      try {
        const sixtySecondsAgo = new Date(Date.now() - 60000)
        const recentOrders = await db.order.findMany({
          where: { createdAt: { gte: sixtySecondsAgo } },
          orderBy: { createdAt: 'asc' },
          take: 50,
        })
        console.log(`[sse] Sending ${recentOrders.length} catch-up order(s)`)
        for (const order of recentOrders) {
          const event = formatOrderEvent(order)
          safeEnqueue(`data: ${JSON.stringify(event)}\n\n`)
        }
      } catch (e: any) {
        console.error('[sse] Catch-up query failed:', e.message)
      }

      // --- Start LISTEN for new orders ---
      try {
        listener = await listenForNewOrders(
          (payload) => {
            console.log('[sse] Forwarding LISTEN notification to admin:', payload?.orderNumber)
            safeEnqueue(`data: ${JSON.stringify(payload)}\n\n`)
          },
          () => {
            // Connection lost — close the SSE stream so EventSource reconnects
            console.log('[sse] Postgres LISTEN connection lost, closing SSE stream')
            cleanup()
          },
        )
      } catch (e: any) {
        console.error('[sse] Failed to start LISTEN:', e.message)
        // Continue without LISTEN — catch-up on next reconnect will handle it
      }

      // --- Heartbeat every 10 seconds ---
      // Keeps the connection alive and detects disconnections
      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat)
          return
        }
        safeEnqueue(': heartbeat\n\n')
      }, 10000)

      // --- Clean up on client disconnect ---
      req.signal.addEventListener('abort', () => {
        console.log('[sse] Client disconnected (abort signal)')
        clearInterval(heartbeat)
        cleanup()
      })

      // --- Clean up on stream cancel ---
      return () => {
        console.log('[sse] Stream cancelled')
        clearInterval(heartbeat)
        cleanup()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (important for SSE)
    },
  })
}

// Format a database Order row into the NewOrderEvent payload expected by the frontend
function formatOrderEvent(order: any): object {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    mobile: order.mobile,
    address: order.address,
    total: Number(order.total),
    itemCount: 0, // Not needed for catch-up events; the frontend fetches full details on view
    createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : String(order.createdAt),
    _catchUp: true, // Flag so the frontend can skip popup/sound for catch-up events
  }
}
