'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

export const useNav = create<NavState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'mehta-nav', // localStorage key — persists the current view
      partialize: (state) => ({
        view: state.view,
        selectedCategory: state.selectedCategory,
      }),
    }
  )
)
