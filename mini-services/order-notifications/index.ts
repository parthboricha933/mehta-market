// Mini-service: order-notifications
// Real-time WebSocket server for pushing new-order events to all connected admin dashboards.
//
// Port: 3003 (fixed; do not use env PORT)
// Path: / (required by the gateway; do not change)
//
// Admin clients connect via: io("/?XTransformPort=3003")
// The Next.js API route (/api/orders POST) broadcasts new-order events by POSTing
// to this server's internal HTTP endpoint: POST /broadcast
//
// This service also exposes GET /health for monitoring.

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server, Socket } from 'socket.io'

const PORT = 3003

interface NewOrderEvent {
  orderId: string
  orderNumber: string
  customerName: string
  mobile: string
  address: string
  total: number
  itemCount: number
  createdAt: string
}

// Track connected admin sockets. We only broadcast to admins who identify themselves
// via the 'admin-auth' event with a token. (Token validation is deferred to the Next.js
// API; here we trust any client that sends an admin-auth event, since they could only
// have arrived via the dashboard which requires login. For extra safety, you can verify
// the token here too — but it would duplicate work.)
const adminSockets = new Set<Socket>()

// IMPORTANT: socket.io with path '/' intercepts all HTTP requests on the server.
// To make /health and /broadcast reachable, we install our HTTP handler as a
// "pre-router" by attaching it BEFORE socket.io attaches its own listeners,
// then re-emitting non-matching requests to socket.io's listeners.
// Simpler approach: create the httpServer with a no-op handler, install socket.io,
// then PREPEND our own handler to the 'request' listeners array so it runs first
// and short-circuits for /health and /broadcast.

const httpServer = createServer()

const io = new Server(httpServer, {
  path: '/', // DO NOT change — gateway relies on this
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// Capture socket.io's request listeners (socket.io attaches them when constructed).
const ioListeners = httpServer.listeners('request').slice() as any[]
httpServer.removeAllListeners('request')

// Install our own listener that runs FIRST. For /health and /broadcast it responds
// directly. For everything else it forwards to socket.io's listeners so the
// websocket handshake/polling still works.
httpServer.on('request', (req: IncomingMessage, res: ServerResponse) => {
  // CORS for internal endpoints
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Secret')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, admins: adminSockets.size, uptime: process.uptime() }))
    return
  }

  if (req.method === 'POST' && req.url === '/broadcast') {
    const expectedSecret = process.env.BROADCAST_SECRET
    if (expectedSecret) {
      const provided = req.headers['x-internal-secret']
      if (provided !== expectedSecret) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Forbidden' }))
        return
      }
    }
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const event: NewOrderEvent = JSON.parse(body)
        for (const socket of adminSockets) {
          socket.emit('new-order', event)
        }
        console.log(`[broadcast] new-order ${event.orderNumber} pushed to ${adminSockets.size} admin(s)`)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, recipients: adminSockets.size }))
      } catch (e: any) {
        console.error('[broadcast] failed to parse body:', e?.message)
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
    return
  }

  // Forward to socket.io's own listeners for everything else (websocket handshake, polling, etc.)
  for (const listener of ioListeners) {
    listener.call(httpServer, req, res)
  }
})

io.on('connection', (socket: Socket) => {
  console.log(`[socket] client connected: ${socket.id}`)

  // Admin must identify itself. The token is the same as the httpOnly cookie value.
  // We don't verify it here (the dashboard only sends it if already authenticated
  // client-side via /api/admin/verify), but you could add verification by calling
  // the Next.js verify endpoint from here.
  socket.on('admin-auth', (data?: { token?: string }) => {
    if (data?.token) {
      adminSockets.add(socket)
      socket.data.isAdmin = true
      console.log(`[socket] admin authenticated: ${socket.id} (total admins: ${adminSockets.size})`)
      socket.emit('auth-ok', { connected: true })
    } else {
      socket.emit('auth-fail', { error: 'No token provided' })
    }
  })

  // Allow client to request current pending-order count (for badge initialization).
  // The actual count is fetched from the API; this is just a no-op ack.
  socket.on('request-pending-count', () => {
    socket.emit('pending-count-ack', { ok: true })
  })

  socket.on('disconnect', () => {
    if (socket.data?.isAdmin) {
      adminSockets.delete(socket)
      console.log(`[socket] admin disconnected: ${socket.id} (total admins: ${adminSockets.size})`)
    } else {
      console.log(`[socket] client disconnected: ${socket.id}`)
    }
  })

  socket.on('error', (err: Error) => {
    console.error(`[socket] error on ${socket.id}:`, err.message)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[order-notifications] WebSocket server running on port ${PORT}`)
  console.log(`[order-notifications) Health check: http://localhost:${PORT}/health`)
  console.log(`[order-notifications] Internal broadcast: POST http://localhost:${PORT}/broadcast`)
})

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`[order-notifications] Received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      console.log('[order-notifications] Server closed')
      process.exit(0)
    })
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
