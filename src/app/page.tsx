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
import { AdminApp } from '@/components/mehta/AdminApp'
import { useNav } from '@/lib/stores/nav'
import { useAdmin } from '@/lib/stores/admin'
import type { Product, Category, OfferPopup as OfferPopupType, ShopInfo } from '@/lib/types'

export default function Home() {
  const view = useNav((s) => s.view)
  const setView = useNav((s) => s.setView)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [offerPopup, setOfferPopup] = useState<OfferPopupType | null>(null)
  const [announcements, setAnnouncements] = useState<string[]>([])
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // Check URL hash/query on mount for admin access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1)
      if (hash === 'admin') {
        setView('admin-login')
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }

      const params = new URLSearchParams(window.location.search)
      const v = params.get('view')
      if (v === 'admin') {
        const tab = params.get('tab')
        const order = params.get('order')
        if (tab) useAdmin.getState().setPendingAdminTab(tab)
        if (order) useAdmin.getState().setHighlightOrderId(order)
        setView('admin-login')
        window.history.replaceState(null, '', window.location.pathname)
      }
      if (v === 'shop') setView('shop')
    }
  }, [setView])

  // Load customer data (only matters for customer views — admin route skips this)
  useEffect(() => {
    // Skip customer data loading if we're on admin route
    if (view === 'admin' || view === 'admin-login') return

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
  }, [view])

  // ============================================
  // ADMIN PANEL — completely separate from customer site
  // Renders ONLY admin code. No customer data, no header/footer.
  // ============================================
  if (view === 'admin' || view === 'admin-login') {
    return <AdminApp />
  }

  // ============================================
  // CUSTOMER WEBSITE — below
  // ============================================

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

      <CartDrawer shopInfo={shopInfo} />
      <FloatingButtons shopInfo={shopInfo} />
      <OfferPopup popup={offerPopup} />
    </div>
  )
}
