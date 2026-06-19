'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NewOrderEvent } from '@/lib/use-admin-sse'

interface AdminState {
  isAuthenticated: boolean
  admin: { id: string; username: string; name: string | null } | null
  sessionExpired: boolean
  sessionExpiryReason: 'inactivity' | 'max_lifetime' | null
  newOrderCount: number
  lastNewOrderEvent: NewOrderEvent | null
  lastNewOrderSeq: number
  highlightOrderId: string | null
  pendingAdminTab: string | null
  setAuth: (a: { id: string; username: string; name: string | null }) => void
  logout: () => void
  setSessionExpired: (reason: 'inactivity' | 'max_lifetime') => void
  clearSessionExpired: () => void
  incrementNewOrder: () => void
  resetNewOrderCount: () => void
  setNewOrderCount: (n: number) => void
  publishNewOrderEvent: (event: NewOrderEvent) => void
  setHighlightOrderId: (id: string | null) => void
  setPendingAdminTab: (tab: string | null) => void
}

export const useAdmin = create<AdminState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      admin: null,
      sessionExpired: false,
      sessionExpiryReason: null,
      newOrderCount: 0,
      lastNewOrderEvent: null,
      lastNewOrderSeq: 0,
      highlightOrderId: null,
      pendingAdminTab: null,
      setAuth: (admin) => set({ isAuthenticated: true, admin, sessionExpired: false, sessionExpiryReason: null }),
      logout: () => set({ isAuthenticated: false, admin: null, sessionExpired: false, sessionExpiryReason: null, newOrderCount: 0, lastNewOrderEvent: null, lastNewOrderSeq: 0, highlightOrderId: null, pendingAdminTab: null }),
      setSessionExpired: (reason) =>
        set({ isAuthenticated: false, admin: null, sessionExpired: true, sessionExpiryReason: reason }),
      clearSessionExpired: () => set({ sessionExpired: false, sessionExpiryReason: null }),
      incrementNewOrder: () => set((s) => ({ newOrderCount: s.newOrderCount + 1 })),
      resetNewOrderCount: () => set({ newOrderCount: 0 }),
      setNewOrderCount: (n) => set({ newOrderCount: Math.max(0, n) }),
      publishNewOrderEvent: (event) =>
        set((s) => ({ lastNewOrderEvent: event, lastNewOrderSeq: s.lastNewOrderSeq + 1 })),
      setHighlightOrderId: (id) => set({ highlightOrderId: id }),
      setPendingAdminTab: (tab) => set({ pendingAdminTab: tab }),
    }),
    {
      name: 'mehta-admin-auth', // localStorage key — persists across app restarts
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        admin: state.admin,
      }), // Only persist auth state, not transient notification data
    }
  )
)
