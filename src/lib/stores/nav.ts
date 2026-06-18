'use client'

import { create } from 'zustand'

export type View = 'home' | 'shop' | 'checkout' | 'order-success' | 'admin-login' | 'admin'

interface NavState {
  view: View
  selectedCategory: string
  searchQuery: string
  lastOrderNumber: string | null
  setView: (v: View) => void
  setCategory: (c: string) => void
  setSearch: (s: string) => void
  setLastOrderNumber: (n: string) => void
}

export const useNav = create<NavState>((set) => ({
  view: 'home',
  selectedCategory: 'all',
  searchQuery: '',
  lastOrderNumber: null,
  setView: (view) => {
    set({ view })
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  },
  setCategory: (selectedCategory) => set({ selectedCategory }),
  setSearch: (searchQuery) => set({ searchQuery }),
  setLastOrderNumber: (lastOrderNumber) => set({ lastOrderNumber }),
}))
