// Single active admin session manager.
// Tracks which admin device is currently logged in and its push subscription.
// Only the ACTIVE device receives push notifications.
//
// Rules:
//   - Only ONE admin can be logged in at a time
//   - Login replaces the previous device's push subscription
//   - Logout removes the push subscription — device stops receiving notifications
//   - Auto-release after 2 minutes without heartbeat (crash/network loss)

import { db } from '@/lib/db'

const SESSION_KEY = 'active_admin_session'
const SESSION_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes without heartbeat = session expired

export interface ActiveSession {
  adminId: string
  adminUsername: string
  sessionToken: string
  loginAt: number
  lastHeartbeat: number
  // Push subscription for the ACTIVE device (VAPID Web Push format)
  pushEndpoint?: string
  pushKeys?: string // JSON-encoded keys object
  pushExpirationTime?: number | null
}

/**
 * Get the current active admin session (or null if none).
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return null

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    const age = Date.now() - session.lastHeartbeat
    if (age > SESSION_TIMEOUT_MS) {
      console.log('[session] Session expired — releasing')
      await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
      return null
    }
    return session
  } catch {
    await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
    return null
  }
}

/**
 * Try to acquire the active admin session.
 * Blocks if another admin/device is already active.
 */
export async function acquireSession(
  adminId: string,
  adminUsername: string,
  sessionToken: string,
): Promise<{ success: boolean; error?: string }> {
  const existing = await getActiveSession()

  if (existing) {
    return {
      success: false,
      error: 'Admin account is already active on another device. Please wait for the current session to end.',
    }
  }

  const session: ActiveSession = {
    adminId,
    adminUsername,
    sessionToken,
    loginAt: Date.now(),
    lastHeartbeat: Date.now(),
  }

  await db.setting.upsert({
    where: { key: SESSION_KEY },
    update: { value: JSON.stringify(session) },
    create: { key: SESSION_KEY, value: JSON.stringify(session) },
  })

  console.log('[session] Session acquired for admin:', adminUsername)
  return { success: true }
}

/**
 * Register/update the push subscription for the active device.
 * Called when the browser subscribes to push (or when the FCM token changes).
 * This REPLACES any previous device's subscription — only the active device
 * will receive notifications.
 */
export async function registerDevicePush(
  sessionToken: string,
  endpoint: string,
  keys: string,
  expirationTime: number | null,
): Promise<boolean> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return false

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    if (session.sessionToken !== sessionToken) return false

    session.pushEndpoint = endpoint
    session.pushKeys = keys
    session.pushExpirationTime = expirationTime

    await db.setting.update({
      where: { key: SESSION_KEY },
      data: { value: JSON.stringify(session) },
    })

    console.log('[session] Push subscription registered for active device:', endpoint.slice(-30))
    return true
  } catch {
    return false
  }
}

/**
 * Get the push subscription for the active device.
 * Returns null if no active session or no push subscription registered.
 * This is what the push notification system uses to send notifications
 * ONLY to the active device.
 */
export async function getActiveDevicePush(): Promise<{
  endpoint: string
  keys: any
  expirationTime: number | null
} | null> {
  const session = await getActiveSession()
  if (!session || !session.pushEndpoint || !session.pushKeys) return null

  try {
    return {
      endpoint: session.pushEndpoint,
      keys: JSON.parse(session.pushKeys),
      expirationTime: session.pushExpirationTime || null,
    }
  } catch {
    return null
  }
}

/**
 * Heartbeat — keeps the session alive.
 */
export async function heartbeatSession(sessionToken: string): Promise<boolean> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return false

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    if (session.sessionToken !== sessionToken) return false

    session.lastHeartbeat = Date.now()
    await db.setting.update({
      where: { key: SESSION_KEY },
      data: { value: JSON.stringify(session) },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Release the active session (logout).
 * Clears the push subscription so the device stops receiving notifications.
 */
export async function releaseSession(sessionToken: string): Promise<void> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    if (session.sessionToken === sessionToken) {
      await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
      console.log('[session] Session released — push subscription cleared')
    }
  } catch {
    await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
  }
}
