'use client'

import { create } from 'zustand'

interface AdminState {
  isAuthenticated: boolean
  admin: { id: string; username: string; name: string | null } | null
  // Session expiry tracking
  sessionExpired: boolean
  sessionExpiryReason: 'inactivity' | 'max_lifetime' | null
  // New-order notification badge counter
  newOrderCount: number
  setAuth: (a: { id: string; username: string; name: string | null }) => void
  logout: () => void
  setSessionExpired: (reason: 'inactivity' | 'max_lifetime') => void
  clearSessionExpired: () => void
  incrementNewOrder: () => void
  resetNewOrderCount: () => void
  setNewOrderCount: (n: number) => void
}

export const useAdmin = create<AdminState>((set) => ({
  isAuthenticated: false,
  admin: null,
  sessionExpired: false,
  sessionExpiryReason: null,
  newOrderCount: 0,
  setAuth: (admin) => set({ isAuthenticated: true, admin, sessionExpired: false, sessionExpiryReason: null }),
  logout: () => set({ isAuthenticated: false, admin: null, sessionExpired: false, sessionExpiryReason: null, newOrderCount: 0 }),
  setSessionExpired: (reason) =>
    set({ isAuthenticated: false, admin: null, sessionExpired: true, sessionExpiryReason: reason }),
  clearSessionExpired: () => set({ sessionExpired: false, sessionExpiryReason: null }),
  incrementNewOrder: () => set((s) => ({ newOrderCount: s.newOrderCount + 1 })),
  resetNewOrderCount: () => set({ newOrderCount: 0 }),
  setNewOrderCount: (n) => set({ newOrderCount: Math.max(0, n) }),
}))
