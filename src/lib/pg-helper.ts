// Postgres connection helper for LISTEN/NOTIFY.
//
// Neon's pooler (PgBouncer) doesn't support LISTEN/NOTIFY in transaction mode.
// So for the SSE endpoint, we need a DIRECT connection to Postgres (not through
// the pooler). This helper derives the direct URL from the pooler URL by
// removing "-pooler" from the hostname.
//
// If DIRECT_DATABASE_URL is set, we use that. Otherwise, we derive it from
// DATABASE_URL by removing "-pooler" from the hostname.

import { Pool } from 'pg'

let pool: Pool | null = null

function getDirectUrl(): string {
  // If DIRECT_DATABASE_URL is explicitly set, use it
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL
  }

  const url = process.env.DATABASE_URL || ''
  // Neon pooler URLs look like: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db
  // Direct URLs look like: postgresql://user:pass@ep-xxx.region.aws.neon.tech/db
  // Just remove "-pooler" from the hostname
  if (url.includes('-pooler.')) {
    return url.replace('-pooler.', '.')
  }

  // If no pooler in URL, use as-is (already a direct connection)
  return url
}

export function getPgPool(): Pool {
  if (pool) return pool

  const connectionString = getDirectUrl()
  console.log('[pg] Creating pool for direct connection (for LISTEN/NOTIFY)')

  pool = new Pool({
    connectionString,
    max: 3, // Small pool — only used for LISTEN/NOTIFY
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    // Neon requires SSL
    ssl: { rejectUnauthorized: false },
  })

  pool.on('error', (err) => {
    console.error('[pg] Pool error:', err.message)
  })

  return pool
}

/**
 * Issue a NOTIFY on the 'new_order' channel with the given payload.
 * Called from /api/orders POST after the order is saved to the database.
 * This wakes up all SSE listeners (in /api/admin/events) which then push
 * the event to connected admin dashboards.
 */
export async function notifyNewOrder(payload: object): Promise<void> {
  const pgPool = getPgPool()
  const client = await pgPool.connect()
  try {
    // NOTIFY payload is limited to 8000 bytes; use JSON
    const json = JSON.stringify(payload)
    // Escape single quotes for SQL
    const escaped = json.replace(/'/g, "''")
    await client.query(`NOTIFY new_order, '${escaped}'`)
    console.log('[pg] NOTIFY new_order sent:', (payload as any).orderNumber)
  } catch (e: any) {
    console.error('[pg] NOTIFY failed:', e.message)
  } finally {
    client.release()
  }
}

/**
 * Listen on the 'new_order' channel. Returns a client that should be released
 * when done. The callback is invoked with the parsed JSON payload whenever a
 * notification arrives.
 */
export async function listenForNewOrders(
  onNotification: (payload: any) => void,
  onDisconnect?: () => void,
): Promise<{ release: () => void }> {
  const pgPool = getPgPool()
  const client = await pgPool.connect()

  // Set up notification listener
  client.on('notification', (msg) => {
    try {
      console.log('[pg] LISTEN received notification')
      const payload = msg.payload ? JSON.parse(msg.payload) : null
      onNotification(payload)
    } catch (e: any) {
      console.error('[pg] Failed to parse notification payload:', e.message)
    }
  })

  // Start listening
  await client.query('LISTEN new_order')
  console.log('[pg] LISTEN new_order started')

  // Handle errors
  client.on('error', (err) => {
    console.error('[pg] Client error during LISTEN:', err.message)
    try { client.release() } catch {}
    onDisconnect?.()
  })

  // Handle unexpected end
  client.on('end', () => {
    console.log('[pg] LISTEN connection ended')
    try { client.release() } catch {}
    onDisconnect?.()
  })

  return {
    release: () => {
      try {
        client.query('UNLISTEN new_order').catch(() => {})
        client.release()
        console.log('[pg] LISTEN stopped, client released')
      } catch {}
    },
  }
}
