'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/mehta/Header'
import { Footer } from '@/components/mehta/Footer'
import { Hero } from '@/components/mehta/Hero'
import { AnnouncementBar } from '@/components/mehta/AnnouncementBar'
import { OfferPopup } from '@/components/mehta/OfferPopup'
import { HomePage } from '@/components/mehta/HomePage'
import { ShopPage } from '@/components/mehta/ShopPage'
import { CheckoutPage } from '@/components/mehta/CheckoutPage'
import { OrderSuccessPage } from '@/components/mehta/OrderSuccessPage'
import { CartDrawer } from '@/components/mehta/CartDrawer'
import { FloatingButtons } from '@/components/mehta/FloatingButtons'
import { AdminLoginPage } from '@/components/mehta/AdminLoginPage'
import { AdminDashboard } from '@/components/mehta/AdminDashboard'
import { SessionExpiredModal } from '@/components/mehta/admin/SessionExpiredModal'
import { useNav } from '@/lib/stores/nav'
import { useAdmin } from '@/lib/stores/admin'
import type { Product, Category, OfferPopup as OfferPopupType, ShopInfo } from '@/lib/types'

export default function Home() {
  const view = useNav((s) => s.view)
  const setView = useNav((s) => s.setView)
  const setAuth = useAdmin((s) => s.setAuth)
  // Subscribe to auth state reactively so the redirect effect fires when login succeeds
  const isAuthenticated = useAdmin((s) => s.isAuthenticated)
  const sessionExpired = useAdmin((s) => s.sessionExpired)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [offerPopup, setOfferPopup] = useState<OfferPopupType | null>(null)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Initial data load
  useEffect(() => {
    Promise.all([
      fetch('/api/products?limit=20').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/settings/offer_popup').then((r) => r.json()),
      fetch('/api/settings/announcements').then((r) => r.json()),
      fetch('/api/settings/shop_info').then((r) => r.json()),
    ])
      .then(([p, c, popup, ann, info]) => {
        setProducts(p.products || [])
        setCategories(c.categories || [])
        setOfferPopup(popup.value)
        setAnnouncements(ann.value || [])
        setShopInfo(info.value)
      })
      .finally(() => setLoading(false))

    // Check admin auth on mount
    fetch('/api/admin/verify', { method: 'POST' })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.authenticated) {
          setAuth(d.admin)
        } else if (d?.expired) {
          // Server says session expired — surface that to the admin store
          useAdmin.getState().setSessionExpired(d.reason || 'inactivity')
        }
      })
      .catch(() => {})

    // Check URL for admin view (SPA — no reload)
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash === 'admin') {
        setView('admin-login')
        // Clear the hash so back button doesn't re-trigger
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      // PWA shortcut
      const params = new URLSearchParams(window.location.search)
      const v = params.get('view')
      if (v === 'shop') setView('shop')
    }
  }, [setView, setAuth])

  // Redirect to admin dashboard if authenticated and on admin-login
  // Redirect to admin login if not authenticated and trying to view admin dashboard
  // Subscribes to isAuthenticated + sessionExpired reactively so the redirect
  // fires immediately when login succeeds (no full page reload needed).
  useEffect(() => {
    if (view === 'admin-login' && isAuthenticated && !sessionExpired) setView('admin')
    if (view === 'admin' && (!isAuthenticated || sessionExpired)) setView('admin-login')
  }, [view, setView, isAuthenticated, sessionExpired])

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="text-center">
          <div className="relative h-20 w-20 mx-auto mb-4">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-green to-brand-green-dark grid place-items-center text-white font-extrabold text-3xl shadow-lg">
              M
            </div>
            <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full border-4 border-background bg-brand-orange animate-spin" style={{ animationDuration: '1.5s' }} />
          </div>
          <h2 className="text-lg font-bold text-foreground">Mehta Super Market</h2>
          <p className="text-sm text-muted-foreground">Loading fresh products...</p>
        </div>
      </div>
    )
  }

  // Admin views (no header/footer)
  if (view === 'admin-login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-cream via-white to-brand-green/5">
        <AdminLoginPage />
        <OfferPopup popup={offerPopup} />
        <SessionExpiredModal />
      </div>
    )
  }

  if (view === 'admin') {
    return <AdminDashboard />
  }

  // Customer views (with header/footer)
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AnnouncementBar messages={announcements} />
      <Header shopInfo={shopInfo} />

      <main className="flex-1">
        {view === 'home' && (
          <>
            <Hero />
            <HomePage products={products} categories={categories} shopInfo={shopInfo} />
          </>
        )}
        {view === 'shop' && <ShopPage categories={categories} />}
        {view === 'checkout' && <CheckoutPage shopInfo={shopInfo} />}
        {view === 'order-success' && <OrderSuccessPage />}
      </main>

      <Footer shopInfo={shopInfo} />

      {/* Global overlays */}
      <CartDrawer shopInfo={shopInfo} />
      <FloatingButtons shopInfo={shopInfo} />
      <OfferPopup popup={offerPopup} />
    </div>
  )
}
