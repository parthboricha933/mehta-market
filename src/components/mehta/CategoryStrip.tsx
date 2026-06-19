'use client'

import {
  ShoppingBasket, Apple, Carrot, Milk, Cookie, CupSoda, Home, LayoutGrid,
  Wheat, Sprout, Droplet, Coffee, Heart, GlassWater, Snowflake, ShowerHead,
  SprayCan, Baby
} from 'lucide-react'
import { useNav } from '@/lib/stores/nav'
import type { Category } from '@/lib/types'

const ICONS: Record<string, any> = {
  ShoppingBasket, Apple, Carrot, Milk, Cookie, CupSoda, Home,
  Wheat, Sprout, Droplet, Coffee, Heart, GlassWater, Snowflake, ShowerHead,
  SprayCan, Baby
}

export function CategoryStrip({ categories }: { categories: Category[] }) {
  const setView = useNav((s) => s.setView)
  const setCategory = useNav((s) => s.setCategory)

  const handleClick = (slug: string) => {
    setCategory(slug)
    setView('shop')
  }

  return (
    <section className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">Shop by Category</h2>
          <p className="text-sm text-muted-foreground">Find everything you need</p>
        </div>
        <button
          onClick={() => { setCategory('all'); setView('shop') }}
          className="text-sm font-semibold text-brand-green hover:text-brand-orange flex items-center gap-1"
        >
          View All <LayoutGrid className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
        {categories.map((c) => {
          const Icon = ICONS[c.icon || ''] || ShoppingBasket
          return (
            <button
              key={c.id}
              onClick={() => handleClick(c.slug)}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-white border border-border hover:border-brand-green hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full grid place-items-center bg-gradient-to-br from-brand-green/10 to-brand-orange/10 text-brand-green group-hover:from-brand-green group-hover:to-brand-orange group-hover:text-white transition-all">
                <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-center leading-tight line-clamp-2">
                {c.name}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
