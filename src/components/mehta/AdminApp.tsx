'use client'

// AdminApp — completely separate from the customer website.
// This is the "admin panel" — a standalone application that:
// 1. Verifies auth on mount (persistent login — stays logged in forever)
// 2. If not authenticated → shows login page
// 3. If authenticated → shows admin dashboard with real-time notifications
// 4. Maintains SSE + polling + FCM connections for instant order notifications
// 5. NO customer data loading, NO header/footer, NO loading screen

import { useEffect, useState } from 'react'
import { AdminLoginPage } from './AdminLoginPage'
import { AdminDashboard } from './AdminDashboard'
import { SessionExpiredModal } from './admin/SessionExpiredModal'
import { useAdmin } from '@/lib/stores/admin'
import { useNav } from '@/lib/stores/nav'

export function AdminApp() {
  const { isAuthenticated, sessionExpired, setAuth, setSessionExpired, clearSessionExpired } = useAdmin()
  const setView = useNav((s) => s.setView)
  const [checking, setChecking] = useState(true)

  // Verify auth on mount — persistent login
  // Cookie lasts 1 year, so admin stays logged in across browser restarts,
  // phone reboots, app kills, etc. Only logs out on explicit logout.
  useEffect(() => {
    console.log('[admin-app] Verifying auth...')
    fetch('/api/admin/verify', { method: 'POST' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.authenticated) {
          console.log('[admin-app] ✅ Authenticated as', d.admin?.username)
          setAuth(d.admin)
        } else if (d?.expired) {
          console.log('[admin-app] Session expired:', d.reason)
          setSessionExpired(d.reason || 'inactivity')
        } else {
          console.log('[admin-app] Not authenticated — showing login')
          // Don't clear localStorage auth on network issues
          // Only clear if server explicitly says "not authenticated"
          if (d === null) {
            useAdmin.getState().logout()
          }
        }
      })
      .catch(() => {
        // Network error — if localStorage says authenticated, trust it
        // This allows offline access to the admin dashboard
        console.log('[admin-app] Network error — trusting localStorage auth')
      })
      .finally(() => setChecking(false))
  }, [])

  // Handle session expired modal dismiss
  const handleSessionExpiredDismiss = () => {
    clearSessionExpired()
  }

  // Handle logout
  const handleLogout = () => {
    useAdmin.getState().logout()
    setView('home')
  }

  // Loading state (very brief — just the verify call)
  if (checking && !isAuthenticated) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-green-dark via-brand-green to-brand-green-light">
        <div className="text-center text-white">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-white grid place-items-center text-brand-green font-extrabold text-2xl shadow-lg animate-pulse">
            M
          </div>
          <p className="text-sm font-semibold">Loading Admin Panel...</p>
        </div>
      </div>
    )
  }

  // Not authenticated → show login page
  if (!isAuthenticated || sessionExpired) {
    return (
      <>
        <AdminLoginPage />
        <SessionExpiredModal />
      </>
    )
  }

  // Authenticated → show admin dashboard
  // The AdminDashboard component handles:
  // - SSE connection (real-time order notifications)
  // - Polling fallback (every 20s)
  // - FCM push notifications (Firebase Cloud Messaging)
  // - VAPID Web Push (fallback)
  // - Heartbeat (keeps session alive)
  // - Notification sound + popup + badge
  return <AdminDashboard />
}
