'use client'

import { create } from 'zustand'
import type { NewOrderEvent } from '@/lib/use-admin-sse'

interface AdminState {
  isAuthenticated: boolean
  admin: { id: string; username: string; name: string | null } | null
  // Session expiry tracking
  sessionExpired: boolean
  sessionExpiryReason: 'inactivity' | 'max_lifetime' | null
  // New-order notification badge counter
  newOrderCount: number
  // Latest new-order event broadcast — components (Orders list, Overview stats)
  // subscribe to this to update themselves in real-time without page refresh.
  // `lastNewOrderSeq` is a monotonically increasing sequence number so subscribers
  // can detect new events even if the same payload is somehow emitted twice.
  lastNewOrderEvent: NewOrderEvent | null
  lastNewOrderSeq: number
  // When a notification is clicked, this stores the order ID to highlight
  // in the Orders tab, and the tab to switch to.
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

export const useAdmin = create<AdminState>((set) => ({
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
}))
