'use client'

import { useEffect, useState, useMemo } from 'react'
import { ProductCard } from './ProductCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, SlidersHorizontal, X, LayoutGrid } from 'lucide-react'
import { useNav } from '@/lib/stores/nav'
import type { Product, Category } from '@/lib/types'

export function ShopPage({ categories }: { categories: Category[] }) {
  const { selectedCategory, setCategory, searchQuery, setSearch } = useNav()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'newest' | 'price-low' | 'price-high' | 'name'>('newest')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedCategory) params.set('category', selectedCategory)
    if (searchQuery) params.set('search', searchQuery)
    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [selectedCategory, searchQuery])

  const sorted = useMemo(() => {
    const arr = [...products]
    switch (sortBy) {
      case 'price-low': return arr.sort((a, b) => a.price - b.price)
      case 'price-high': return arr.sort((a, b) => b.price - a.price)
      case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name))
      default: return arr
    }
  }, [products, sortBy])

  const activeCat = categories.find((c) => c.slug === selectedCategory)

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Heading */}
      <div className="mb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground flex items-center gap-2">
          <LayoutGrid className="h-6 w-6 text-brand-green" />
          {activeCat ? activeCat.name : 'All Products'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading...' : `${sorted.length} ${sorted.length === 1 ? 'item' : 'items'} available`}
          {activeCat && <span className="ml-1">in {activeCat.name}</span>}
        </p>
      </div>

      {/* Category pills */}
      <div className="mb-5 -mx-4 px-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setCategory('all')}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              selectedCategory === 'all' || !selectedCategory
                ? 'bg-brand-green text-white shadow-md'
                : 'bg-white border border-border text-foreground hover:border-brand-green'
            }`}
          >
            All Items
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
                selectedCategory === c.slug
                  ? 'bg-brand-green text-white shadow-md'
                  : 'bg-white border border-border text-foreground hover:border-brand-green'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-2 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-24 w-24 mx-auto rounded-full bg-muted grid place-items-center mb-4">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-foreground mb-1">No products found</h3>
          <p className="text-sm text-muted-foreground mb-4">Try a different search or category</p>
          <Button
            onClick={() => { setSearch(''); setCategory('all') }}
            variant="outline"
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {sorted.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
