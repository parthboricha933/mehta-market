// Single active admin session manager.
// Uses the existing Setting model (key: 'active_admin_session') to track
// which admin is currently logged in — NO database schema changes needed.
//
// Rules:
//   - Only ONE admin can be logged in at a time
//   - If Admin A is active, Admin B gets "Admin account is already active on another device"
//   - When Admin A logs out, Admin B can log in immediately
//   - If Admin A's device crashes / loses internet, the session auto-releases
//     after SESSION_TIMEOUT_MS (2 minutes without heartbeat)

import { db } from '@/lib/db'

const SESSION_KEY = 'active_admin_session'
const SESSION_TIMEOUT_MS = 2 * 60 * 1000 // 2 minutes without heartbeat = session expired

export interface ActiveSession {
  adminId: string
  adminUsername: string
  sessionToken: string
  loginAt: number
  lastHeartbeat: number
}

/**
 * Get the current active admin session (or null if none).
 * Automatically cleans up expired sessions.
 */
export async function getActiveSession(): Promise<ActiveSession | null> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return null

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    // Check if session has expired (no heartbeat for SESSION_TIMEOUT_MS)
    const age = Date.now() - session.lastHeartbeat
    if (age > SESSION_TIMEOUT_MS) {
      // Session expired — clean it up
      console.log('[session] Active session expired (no heartbeat for', Math.round(age / 1000), 's) — releasing')
      await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
      return null
    }
    return session
  } catch {
    // Corrupt session data — clean up
    await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
    return null
  }
}

/**
 * Try to acquire the active admin session.
 * Returns { success: true } if acquired, or { success: false, error: message } if blocked.
 */
export async function acquireSession(
  adminId: string,
  adminUsername: string,
  sessionToken: string,
): Promise<{ success: boolean; error?: string }> {
  const existing = await getActiveSession()

  if (existing) {
    // Same admin re-logging in? Allow it (take over the session)
    if (existing.adminId === adminId) {
      console.log('[session] Same admin re-login — updating session')
    } else {
      // Different admin is active — block
      console.log('[session] Blocked login — admin', existing.adminUsername, 'is already active')
      return {
        success: false,
        error: 'Admin account is already active on another device. Please wait for the current session to end.',
      }
    }
  }

  // Acquire the session
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
 * Update the heartbeat timestamp for the active session.
 * Called by the admin dashboard every 30 seconds via /api/admin/heartbeat.
 * Only updates if the sessionToken matches (prevents hijacking).
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
 * Release the active admin session (logout).
 * Only releases if the sessionToken matches.
 */
export async function releaseSession(sessionToken: string): Promise<void> {
  const setting = await db.setting.findFirst({ where: { key: SESSION_KEY } })
  if (!setting) return

  try {
    const session: ActiveSession = JSON.parse(setting.value)
    if (session.sessionToken === sessionToken) {
      await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
      console.log('[session] Session released for admin:', session.adminUsername)
    }
  } catch {
    await db.setting.delete({ where: { key: SESSION_KEY } }).catch(() => {})
  }
}
