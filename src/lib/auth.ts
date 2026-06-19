// Auth utilities for Mehta Super Market admin
// Provides password hashing, session token creation/verification, and inactivity-based expiry.
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export const SESSION_TIMEOUT_MS = 365 * 24 * 60 * 60 * 1000 // 1 year — session persists across browser restarts
export const SESSION_ABSOLUTE_MAX_MS = 365 * 24 * 60 * 60 * 1000 // 1 year max session lifetime

// Maximum number of admin accounts allowed in the system.
// No limit on admin accounts — any number can exist.
// However, only ONE admin can be logged in at a time (enforced by session-manager.ts).
export const MAX_ADMIN_ACCOUNTS = 999999

export interface SessionPayload {
  adminId: string
  loginAt: number
  lastActivity: number
  version: number // for invalidating sessions if needed
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(plain, salt)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

export function isPasswordHashed(s: string): boolean {
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  return /^\$2[aby]\$\d{2}\$/.test(s)
}

export function createSessionToken(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64')
}

export function parseSessionToken(token: string): SessionPayload | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded) as SessionPayload
    if (!payload?.adminId || !payload?.loginAt || !payload?.lastActivity) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Verify session validity.
 * Returns:
 *   - { valid: true, admin, payload } if session is active
 *   - { valid: false, expired: true, reason: 'inactivity' } if 30-min inactivity exceeded
 *   - { valid: false, expired: true, reason: 'max_lifetime' } if absolute max exceeded
 *   - { valid: false, expired: false } if no/invalid token
 */
export async function verifySession(token: string | undefined): Promise<{
  valid: boolean
  expired?: boolean
  reason?: 'inactivity' | 'max_lifetime' | 'invalid'
  admin?: { id: string; username: string; name: string | null }
  payload?: SessionPayload
}> {
  if (!token) return { valid: false, expired: false, reason: 'invalid' }
  const payload = parseSessionToken(token)
  if (!payload) return { valid: false, expired: false, reason: 'invalid' }

  const admin = await db.admin.findUnique({ where: { id: payload.adminId } })
  if (!admin) return { valid: false, expired: false, reason: 'invalid' }

  const now = Date.now()

  // Absolute max session lifetime
  if (now - payload.loginAt > SESSION_ABSOLUTE_MAX_MS) {
    return { valid: false, expired: true, reason: 'max_lifetime' }
  }

  // Inactivity check
  if (now - payload.lastActivity > SESSION_TIMEOUT_MS) {
    return { valid: false, expired: true, reason: 'inactivity' }
  }

  return {
    valid: true,
    admin: { id: admin.id, username: admin.username, name: admin.name },
    payload,
  }
}

/**
 * Refresh the session with a new lastActivity timestamp.
 * Used on every admin API call to implement sliding expiration.
 */
export function refreshSessionToken(payload: SessionPayload): string {
  const refreshed: SessionPayload = {
    ...payload,
    lastActivity: Date.now(),
  }
  return createSessionToken(refreshed)
}

export function setSessionCookie(res: any, token: string) {
  res.cookies.set('mehta_admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 365 * 24 * 60 * 60, // 1 year — cookie persists across browser restarts
    path: '/',
  })
}

export function clearSessionCookie(res: any) {
  res.cookies.set('mehta_admin_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}
