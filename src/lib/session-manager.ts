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
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes without heartbeat = session expired
// (was 2 min — too aggressive, caused auto-logout when tab was closed briefly)

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
  // FCM token for the ACTIVE device (Firebase Cloud Messaging)
  fcmToken?: string
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
    // Same admin re-logging in? Allow it — take over the session.
    // This handles: phone app killed → reopen → cookie gone → need to login again
    if (existing.adminId === adminId) {
      console.log('[session] Same admin re-login — taking over session')
    } else {
      // Different admin is active — block
      console.log('[session] Blocked login — admin', existing.adminUsername, 'is already active')
      return {
        success: false,
        error: 'Admin account is already active on another device. Please wait for the current session to end.',
      }
    }
  }

  // Acquire/take over the session
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
 * Register/update FCM token for the active device.
 * Called when the browser gets an FCM token from Firebase Messaging.
 * Only the active device's FCM token is stored — old devices don't receive FCM push.
 */
export async function registerFCMToken(sessionToken: string, fcmToken: string): Promise<boolean> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return false

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    if (session.sessionToken !== sessionToken) return false

    session.fcmToken = fcmToken || undefined

    await db.setting.update({
      where: { key: SESSION_KEY },
      data: { value: JSON.stringify(session) },
    })

    if (fcmToken) {
      console.log('[session] FCM token registered for active device')
    } else {
      console.log('[session] FCM token cleared')
    }
    return true
  } catch {
    return false
  }
}

/**
 * Get the FCM token for the active device.
 * Returns null if no active session or no FCM token registered.
 */
export async function getActiveFCMToken(): Promise<string | null> {
  const session = await getActiveSession()
  if (!session || !session.fcmToken) return null
  return session.fcmToken
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
