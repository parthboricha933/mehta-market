'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ShoppingCart, Search, Home, Store, Phone, Menu, X, Shield
} from 'lucide-react'
import { useState } from 'react'
import { useCart, cartCount } from '@/lib/stores/cart'
import { useNav } from '@/lib/stores/nav'
import type { ShopInfo } from '@/lib/types'

export function Header({ shopInfo }: { shopInfo: ShopInfo | null }) {
  const count = useCart((s) => cartCount(s.items))
  const openCart = useCart((s) => s.openCart)
  const { view, setView, setCategory, searchQuery, setSearch } = useNav()
  const [mobileMenu, setMobileMenu] = useState(false)

  const navItems = [
    { label: 'Home', value: 'home' as const, icon: Home },
    { label: 'Shop', value: 'shop' as const, icon: Store },
  ]

  return (
    <>
      <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 h-16">
            {/* Logo */}
            <button
              onClick={() => { setView('home'); setCategory('all') }}
              className="flex items-center gap-2 flex-shrink-0"
            >
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-brand-green to-brand-green-dark grid place-items-center text-white font-extrabold text-xl shadow-md">
                M
              </div>
              <div className="hidden sm:block text-left leading-none">
                <div className="font-extrabold text-foreground text-base">
                  Mehta <span className="text-brand-orange">Super Market</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">Rajula • Since 1995</div>
              </div>
            </button>

            {/* Search (desktop) */}
            <div className="hidden md:flex flex-1 max-w-xl mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => view !== 'shop' && setView('shop')}
                  placeholder="Search for groceries, fruits, vegetables..."
                  className="pl-10 bg-muted/50 border-muted-foreground/20 focus-visible:ring-brand-green"
                />
              </div>
            </div>

            {/* Nav items */}
            <nav className="hidden sm:flex items-center gap-1 ml-auto">
              {navItems.map((n) => (
                <button
                  key={n.value}
                  onClick={() => setView(n.value)}
                  className={`px-3 py-2 rounded-md text-sm font-semibold transition ${
                    view === n.value
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'text-foreground hover:bg-muted'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </nav>

            {/* Cart */}
            <Button
              onClick={openCart}
              variant="outline"
              className="relative ml-1 border-brand-green/30 hover:bg-brand-green/10 hover:text-brand-green hover:border-brand-green"
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-2 -right-2 h-5 min-w-[1.25rem] px-1 grid place-items-center bg-brand-orange text-white text-[10px] font-bold rounded-full animate-bounce-in">
                  {count}
                </span>
              )}
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Search (mobile) */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => view !== 'shop' && setView('shop')}
                placeholder="Search products..."
                className="pl-10 bg-muted/50"
              />
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="sm:hidden border-t bg-white">
            <nav className="container mx-auto px-4 py-3 space-y-1">
              {navItems.map((n) => (
                <button
                  key={n.value}
                  onClick={() => { setView(n.value); setMobileMenu(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold ${
                    view === n.value ? 'bg-brand-green/10 text-brand-green' : 'text-foreground'
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                </button>
              ))}
              <a
                href={`tel:${shopInfo?.phone || '+919876543210'}`}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-brand-orange"
              >
                <Phone className="h-4 w-4" />
                Call to Order
              </a>
              <button
                onClick={() => { setView('admin-login'); setMobileMenu(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold text-muted-foreground"
              >
                <Shield className="h-4 w-4" />
                Admin Login
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}
