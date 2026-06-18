'use client'

import { create } from 'zustand'

interface AdminState {
  isAuthenticated: boolean
  admin: { id: string; username: string; name: string | null } | null
  setAuth: (a: { id: string; username: string; name: string | null }) => void
  logout: () => void
}

export const useAdmin = create<AdminState>((set) => ({
  isAuthenticated: false,
  admin: null,
  setAuth: (admin) => set({ isAuthenticated: true, admin }),
  logout: () => set({ isAuthenticated: false, admin: null }),
}))
