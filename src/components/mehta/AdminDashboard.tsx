'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Store, Bell, Image as ImageIcon,
  TrendingUp, IndianRupee, Clock, CheckCircle2, XCircle, Ticket
} from 'lucide-react'
import { useAdmin } from '@/lib/stores/admin'
import { useNav } from '@/lib/stores/nav'
import { AdminOverview } from './admin/AdminOverview'
import { AdminProducts } from './admin/AdminProducts'
import { AdminOrders } from './admin/AdminOrders'
import { AdminCategories } from './admin/AdminCategories'
import { AdminCoupons } from './admin/AdminCoupons'
import { AdminPopup } from './admin/AdminPopup'
import { AdminAnnouncements } from './admin/AdminAnnouncements'
import { NewOrderNotification } from './admin/NewOrderNotification'
import { SessionExpiredModal } from './admin/SessionExpiredModal'
import { useAdminSSE, type NewOrderEvent } from '@/lib/use-admin-sse'
import { useInactivityLogout } from '@/lib/use-inactivity-logout'
import { usePushNotifications } from '@/lib/use-push-notifications'
import { primeAudioOnUserInteraction } from '@/lib/sound'
import { toast } from 'sonner'

export function AdminDashboard() {
  const { admin, logout, newOrderCount, resetNewOrderCount, sessionExpired, pendingAdminTab, highlightOrderId, setPendingAdminTab } = useAdmin()
  const setView = useNav((s) => s.setView)
  const [tab, setTab] = useState(() => pendingAdminTab || 'overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [notification, setNotification] = useState<NewOrderEvent | null>(null)
  const ordersTabRef = useRef<() => void>(() => {})

  // If there's a pending admin tab (from notification click), switch to it
  // and clear the pending state so it only fires once.
  useEffect(() => {
    if (pendingAdminTab) {
      setTab(pendingAdminTab)
      setPendingAdminTab(null)
    }
  }, [pendingAdminTab, setPendingAdminTab])

  // Register service worker + subscribe to push notifications (PWA).
  // Works even when the tab is closed (uses Web Push API + VAPID).
  // Only enabled while authenticated AND not session-expired.
  const { showLocalNotification } = usePushNotifications(!sessionExpired)

  // Connect to SSE for real-time new-order notifications.
  // Uses Postgres LISTEN/NOTIFY — works on both sandbox AND Vercel.
  // Only connect while authenticated AND not session-expired.
  useAdminSSE({
    enabled: !sessionExpired,
    onNewOrder: (event) => {
      console.log('[dashboard] onNewOrder callback — showing popup for:', event.orderNumber)
      setNotification(event)
      toast.success(`New order: ${event.orderNumber}`, {
        description: `${event.customerName} • ₹${event.total.toFixed(0)}`,
        duration: 8000,
      })

      // If the page is hidden (minimized, background, screen locked), show a
      // local notification via the service worker. This covers the case where
      // the SSE connection is alive but the user isn't looking at the tab.
      // For the "tab fully closed" case, the Web Push API handles it separately.
      if (typeof document !== 'undefined' && document.hidden) {
        showLocalNotification({
          title: '🔔 New Order Received',
          body: `Order: ${event.orderNumber}\nCustomer: ${event.customerName}\nAmount: ₹${event.total.toFixed(0)}`,
          tag: `order-${event.orderNumber}`,
          orderId: event.orderId,
        })
      }
    },
  })

  // 30-minute inactivity auto-logout
  useInactivityLogout()

  // Prime audio context on first user interaction (so notification sound can play later)
  useEffect(() => {
    const cleanup = primeAudioOnUserInteraction()
    return cleanup
  }, [])

  // Initial badge count: fetch pending orders count on mount
  useEffect(() => {
    fetch('/api/orders?status=pending')
      .then((r) => r.json())
      .then((d) => {
        const count = d?.orders?.length || 0
        useAdmin.getState().setNewOrderCount(count)
      })
      .catch(() => {})
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/verify', { method: 'DELETE' })
    } catch {}
    logout()
    setView('home')
  }

  const handleViewOrder = (orderId: string) => {
    // Switch to orders tab and trigger refresh; the AdminOrders component reloads when tab changes.
    setTab('orders')
    resetNewOrderCount()
  }

  const navItems = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'products', label: 'Products', icon: Package },
    { value: 'categories', label: 'Categories', icon: Store },
    { value: 'coupons', label: 'Coupons', icon: Ticket },
    { value: 'popup', label: 'Offer Popup', icon: ImageIcon },
    { value: 'announcements', label: 'Announcements', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-muted/30 w-full overflow-x-hidden">
      {/* Top admin bar */}
      <header className="sticky top-0 z-30 bg-brand-green text-white shadow-lg w-full">
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3 max-w-7xl mx-auto">
          <div className="h-8 w-8 rounded-lg bg-white grid place-items-center text-brand-green font-extrabold flex-shrink-0">M</div>
          <div className="leading-none min-w-0 flex-shrink">
            <div className="font-bold text-xs sm:text-sm truncate">Mehta Super Market</div>
            <div className="text-[9px] sm:text-[10px] text-white/70">Admin Dashboard</div>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {/* Live new-order badge with bell icon */}
            <button
              onClick={() => { setTab('orders'); resetNewOrderCount() }}
              className="relative h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition flex-shrink-0"
              aria-label={`View orders, ${newOrderCount} new`}
              title={`${newOrderCount} new order${newOrderCount === 1 ? '' : 's'}`}
            >
              <Bell className="h-4 w-4" />
              {newOrderCount > 0 && (
                <span
                  key={newOrderCount}
                  className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 grid place-items-center bg-brand-orange text-white text-[10px] font-bold rounded-full shadow-md animate-bounce-in"
                >
                  {newOrderCount > 99 ? '99+' : newOrderCount}
                </span>
              )}
            </button>

            <span className="hidden sm:inline text-sm text-white/80">
              Hi, {admin?.name || admin?.username}
            </span>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white flex-shrink-0 px-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Desktop: sidebar + content | Mobile: stacked with horizontal tab scroll */}
      <div className="px-3 sm:px-4 py-4 max-w-7xl mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block fixed top-20 left-4 w-[220px] z-20">
          <nav className="space-y-1 bg-white rounded-xl p-2 shadow-sm">
            {navItems.map((n) => (
              <button
                key={n.value}
                onClick={() => setTab(n.value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition ${
                  tab === n.value
                    ? 'bg-brand-green text-white shadow-md'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile: horizontal scrollable tab bar */}
        <div className="lg:hidden mb-3 sticky top-14 bg-muted/30 py-2 z-10 -mx-3 px-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {navItems.map((n) => (
              <button
                key={n.value}
                onClick={() => setTab(n.value)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 flex-shrink-0 ${
                  tab === n.value ? 'bg-brand-green text-white shadow' : 'bg-white border border-border'
                }`}
              >
                <n.icon className="h-3 w-3" />
                {n.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="min-w-0 w-full lg:ml-[240px]">
          <div className="w-full overflow-x-hidden">
            {tab === 'overview' && <AdminOverview />}
            {tab === 'orders' && <AdminOrders highlightOrderId={highlightOrderId} />}
            {tab === 'products' && <AdminProducts />}
            {tab === 'categories' && <AdminCategories />}
            {tab === 'coupons' && <AdminCoupons />}
            {tab === 'popup' && <AdminPopup />}
            {tab === 'announcements' && <AdminAnnouncements />}
          </div>
        </main>
      </div>

      {/* Real-time new order notification popup */}
      <NewOrderNotification
        event={notification}
        onClose={() => setNotification(null)}
        onView={handleViewOrder}
      />

      {/* Session expired modal (auto-logout after 30 min inactivity) */}
      <SessionExpiredModal />
    </div>
  )
}
