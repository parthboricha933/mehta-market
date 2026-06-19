'use client'

// Hook that monitors user activity and triggers auto-logout after 30 minutes
// of inactivity. Also periodically polls /api/admin/verify to detect server-side
// session expiry (e.g. if another tab logged out, or the cookie expired).

import { useEffect, useRef, useCallback } from 'react'
import { useAdmin } from '@/lib/stores/admin'

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000 // 30 minutes
const POLL_INTERVAL_MS = 60 * 1000 // 1 minute
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function useInactivityLogout() {
  const lastActivityRef = useRef<number>(Date.now())
  const setSessionExpired = useAdmin((s) => s.setSessionExpired)
  const isAuthenticated = useAdmin((s) => s.isAuthenticated)

  // Update last activity timestamp on any user interaction
  useEffect(() => {
    if (!isAuthenticated) return
    const updateActivity = () => {
      lastActivityRef.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, updateActivity, { passive: true })
    )
    return () => {
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, updateActivity)
      )
    }
  }, [isAuthenticated])

  // Periodic check: inactivity + server-side session validation
  useEffect(() => {
    if (!isAuthenticated) return

    const check = async () => {
      // 1. Client-side inactivity check (primary)
      const idleMs = Date.now() - lastActivityRef.current
      if (idleMs >= INACTIVITY_LIMIT_MS) {
        setSessionExpired('inactivity')
        // Tell server to clear cookie
        try { await fetch('/api/admin/verify', { method: 'DELETE' }) } catch {}
        return
      }

      // 2. Server-side session check (catches cookie expiry, max lifetime, etc.)
      try {
        const res = await fetch('/api/admin/verify', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data?.expired) {
            // reason is 'inactivity' or 'max_lifetime'
            setSessionExpired(data.reason || 'inactivity')
          } else {
            // Not authenticated for any other reason — treat as session expired
            setSessionExpired('inactivity')
          }
        }
      } catch {
        // network error — don't log out on transient failures
      }
    }

    // Check immediately on mount, then on interval
    check()
    const interval = window.setInterval(check, POLL_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isAuthenticated, setSessionExpired])

  // Reset activity timer whenever the user does something
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  return { resetActivity }
}
