'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  LayoutDashboard, Package, ShoppingCart, Settings, LogOut, Store, Bell, Image as ImageIcon,
  TrendingUp, IndianRupee, Clock, CheckCircle2, XCircle
} from 'lucide-react'
import { useAdmin } from '@/lib/stores/admin'
import { useNav } from '@/lib/stores/nav'
import { AdminOverview } from './admin/AdminOverview'
import { AdminProducts } from './admin/AdminProducts'
import { AdminOrders } from './admin/AdminOrders'
import { AdminCategories } from './admin/AdminCategories'
import { AdminPopup } from './admin/AdminPopup'
import { AdminAnnouncements } from './admin/AdminAnnouncements'

export function AdminDashboard() {
  const { admin, logout } = useAdmin()
  const setView = useNav((s) => s.setView)
  const [tab, setTab] = useState('overview')
  const [mobileNav, setMobileNav] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/verify', { method: 'DELETE' })
    } catch {}
    logout()
    setView('home')
  }

  const navItems = [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'orders', label: 'Orders', icon: ShoppingCart },
    { value: 'products', label: 'Products', icon: Package },
    { value: 'categories', label: 'Categories', icon: Store },
    { value: 'popup', label: 'Offer Popup', icon: ImageIcon },
    { value: 'announcements', label: 'Announcements', icon: Bell },
  ]

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top admin bar */}
      <header className="sticky top-0 z-30 bg-brand-green text-white shadow-lg">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white grid place-items-center text-brand-green font-extrabold">M</div>
          <div className="leading-none">
            <div className="font-bold text-sm">Mehta Super Market</div>
            <div className="text-[10px] text-white/70">Admin Dashboard</div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-white/80">
              Hi, {admin?.name || admin?.username}
            </span>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/15 hover:text-white"
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-5">
        <div className="grid lg:grid-cols-[220px_1fr] gap-5">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block">
            <nav className="sticky top-20 space-y-1 bg-white rounded-xl p-2 shadow-sm">
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

          {/* Mobile tab selector */}
          <div className="lg:hidden -mx-4 px-4 mb-2">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {navItems.map((n) => (
                <button
                  key={n.value}
                  onClick={() => setTab(n.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                    tab === n.value ? 'bg-brand-green text-white' : 'bg-white border border-border'
                  }`}
                >
                  <n.icon className="h-3.5 w-3.5" />
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content */}
          <main className="min-w-0">
            {tab === 'overview' && <AdminOverview />}
            {tab === 'orders' && <AdminOrders />}
            {tab === 'products' && <AdminProducts />}
            {tab === 'categories' && <AdminCategories />}
            {tab === 'popup' && <AdminPopup />}
            {tab === 'announcements' && <AdminAnnouncements />}
          </main>
        </div>
      </div>
    </div>
  )
}
