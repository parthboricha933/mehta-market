'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Truck, Clock, Shield, Tag, TrendingUp, ArrowRight, MapPin, Phone, Star } from 'lucide-react'
import { ProductCard } from './ProductCard'
import { CategoryStrip } from './CategoryStrip'
import { useNav } from '@/lib/stores/nav'
import type { Product, Category, ShopInfo } from '@/lib/types'

export function HomePage({
  products,
  categories,
  shopInfo,
}: {
  products: Product[]
  categories: Category[]
  shopInfo: ShopInfo | null
}) {
  const setView = useNav((s) => s.setView)
  const setCategory = useNav((s) => s.setCategory)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (products.length) setLoading(false)
  }, [products])

  const featured = products.slice(0, 10)
  const bestSellers = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5)

  return (
    <div>
      {/* Category strip */}
      <CategoryStrip categories={categories} />

      {/* Features banner */}
      <section className="container mx-auto px-4 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₹500', color: 'text-brand-green bg-brand-green/10' },
            { icon: Clock, title: 'Fast Delivery', desc: 'Within 2 hours in Rajula', color: 'text-brand-orange bg-brand-orange/10' },
            { icon: Shield, title: '100% Fresh', desc: 'Quality guaranteed', color: 'text-brand-green bg-brand-green/10' },
            { icon: Tag, title: 'Best Prices', desc: 'In Rajula city', color: 'text-brand-orange bg-brand-orange/10' },
          ].map((f, i) => (
            <Card key={i} className="p-3 flex items-center gap-3 border-border hover:shadow-md transition">
              <div className={`h-10 w-10 rounded-full grid place-items-center ${f.color} flex-shrink-0`}>
                <f.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-foreground leading-tight">{f.title}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{f.desc}</div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-orange" />
              Featured Products
            </h2>
            <p className="text-sm text-muted-foreground">Handpicked fresh items for you</p>
          </div>
          <button
            onClick={() => { setCategory('all'); setView('shop') }}
            className="text-sm font-semibold text-brand-green hover:text-brand-orange flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shimmer aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Promo banner */}
      <section className="container mx-auto px-4 py-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-green via-brand-green-light to-brand-green text-white p-6 sm:p-8">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-brand-orange/30 blur-3xl" />
            <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-brand-orange/20 blur-3xl" />
          </div>
          <div className="relative grid sm:grid-cols-2 gap-4 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-brand-orange px-3 py-1 rounded-full text-xs font-bold mb-2">
                <Star className="h-3 w-3 fill-white" /> Limited Time Offer
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-2">
                Get <span className="text-brand-orange-light">₹50 OFF</span> on your first order!
              </h3>
              <p className="text-sm text-white/85 mb-4">
                Use code <span className="bg-white/20 px-2 py-0.5 rounded font-mono font-bold">WELCOME50</span> at checkout. Min order ₹500.
              </p>
              <Button
                onClick={() => setView('shop')}
                className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold"
              >
                Shop Now <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <div className="hidden sm:flex justify-end">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=400&q=75"
                  alt="Special offer"
                  className="w-48 h-48 rounded-2xl object-cover border-4 border-white/30 shadow-2xl"
                  loading="lazy"
                />
                <div className="absolute -top-3 -right-3 bg-brand-orange text-white h-16 w-16 rounded-full grid place-items-center text-center shadow-xl rotate-12 animate-float">
                  <div>
                    <div className="text-[10px] leading-none">UP TO</div>
                    <div className="text-xl font-extrabold leading-none">40%</div>
                    <div className="text-[10px] leading-none">OFF</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground flex items-center gap-2">
                <Star className="h-5 w-5 text-brand-orange fill-brand-orange" />
                Best Sellers
              </h2>
              <p className="text-sm text-muted-foreground">Most loved by Rajula customers</p>
            </div>
            <button
              onClick={() => { setCategory('all'); setView('shop') }}
              className="text-sm font-semibold text-brand-green hover:text-brand-orange flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Contact CTA */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card className="p-5 flex items-center gap-4 border-brand-green/30 bg-brand-green/5">
            <div className="h-14 w-14 rounded-full bg-brand-green grid place-items-center text-white flex-shrink-0">
              <Phone className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Prefer to call?</h3>
              <p className="text-sm text-muted-foreground mb-1">Order on phone, we&apos;ll deliver</p>
              <a
                href={`tel:${shopInfo?.phone || '+919876543210'}`}
                className="text-sm font-bold text-brand-green hover:underline"
              >
                {shopInfo?.phone || '+91 98765 43210'}
              </a>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4 border-brand-orange/30 bg-brand-orange/5">
            <div className="h-14 w-14 rounded-full bg-brand-orange grid place-items-center text-white flex-shrink-0">
              <MapPin className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-foreground">Visit our store</h3>
              <p className="text-sm text-muted-foreground mb-1">{shopInfo?.address || 'Main Bazar, Rajula'}</p>
              <p className="text-xs font-semibold text-brand-orange">{shopInfo?.hours || 'Open 7 AM - 10 PM'}</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
