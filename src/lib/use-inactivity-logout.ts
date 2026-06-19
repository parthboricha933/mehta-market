'use client'

// Session health monitor — keeps the admin session alive.
// NO auto-logout on inactivity — admin stays logged in until explicit logout.
// Only checks if the session was taken by another admin (via heartbeat 403).

import { useEffect } from 'react'
import { useAdmin } from '@/lib/stores/admin'

const CHECK_INTERVAL_MS = 2 * 60 * 1000 // Check every 2 minutes

export function useInactivityLogout() {
  const setSessionExpired = useAdmin((s) => s.setSessionExpired)
  const isAuthenticated = useAdmin((s) => s.isAuthenticated)

  useEffect(() => {
    if (!isAuthenticated) return

    const check = async () => {
      // Server-side session check — only logs out if session was taken
      // by another admin or explicitly invalidated
      try {
        const res = await fetch('/api/admin/verify', { method: 'POST' })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data?.expired) {
            setSessionExpired(data.reason || 'inactivity')
          }
        }
      } catch {
        // network error — don't log out on transient failures
      }
    }

    // Check on mount, then every 2 minutes
    check()
    const interval = window.setInterval(check, CHECK_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [isAuthenticated, setSessionExpired])
}
