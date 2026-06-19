'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Minus, ShoppingCart, Check, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/lib/stores/cart'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ProductCard({ product }: { product: Product }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCart((s) => s.addItem)
  const updateQuantity = useCart((s) => s.updateQuantity)
  const cartItem = useCart((s) => s.items.find((i) => i.id === product.id))
  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=400&q=70'

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0

  // Whether this product is in the cart
  const inCartQty = cartItem?.quantity || 0
  const isInCart = inCartQty > 0

  const handleAdd = () => {
    setAdding(true)
    setTimeout(() => {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        image,
        unit: product.unit || '',
      })
      setAdding(false)
      setAdded(true)
      // Show toast notification (cart does NOT auto-open)
      toast.success('✓ Item added to cart', {
        description: product.name,
        duration: 2000,
      })
      setTimeout(() => setAdded(false), 1500)
    }, 250)
  }

  const handleIncrement = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      image,
      unit: product.unit || '',
    })
  }

  const handleDecrement = () => {
    if (inCartQty > 1) {
      updateQuantity(product.id, inCartQty - 1)
    } else {
      // Remove from cart entirely
      updateQuantity(product.id, 0)
    }
  }

  return (
    <Card className="group relative overflow-hidden p-0 border-border hover:border-brand-green hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {discount > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
          {discount}% OFF
        </div>
      )}
      {isInCart && (
        <div className="absolute top-2 right-2 z-10 bg-brand-green text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center gap-1">
          <Check className="h-2.5 w-2.5" /> In Cart
        </div>
      )}
      {!product.isActive && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          Out of Stock
        </div>
      )}

      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={image}
          alt={product.name}
          loading="eager"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            // Fallback: if image fails to load, swap to a data-uri placeholder
            const target = e.target as HTMLImageElement
            if (!target.dataset.errored) {
              target.dataset.errored = '1'
              target.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
                '<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="#f3f4f6"/><text x="200" y="200" font-size="80" text-anchor="middle" dominant-baseline="middle">📦</text><text x="200" y="280" font-size="18" text-anchor="middle" fill="#6b7280" font-family="Arial">No Image</text></svg>'
              )
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1 text-foreground min-h-[2.5rem]">
          {product.name}
        </h3>
        {product.unit && (
          <p className="text-xs text-muted-foreground mb-2">{product.unit}</p>
        )}

        <div className="flex items-baseline gap-1.5 mb-3 mt-auto">
          <span className="text-base font-extrabold text-brand-green">₹{product.price.toFixed(0)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="text-xs text-muted-foreground line-through">₹{product.mrp.toFixed(0)}</span>
          )}
        </div>

        {/* Add to Cart button OR quantity controls (if already in cart) */}
        {!isInCart ? (
          <Button
            onClick={handleAdd}
            disabled={!product.isActive || adding}
            size="sm"
            className={cn(
              "w-full h-9 text-xs font-bold transition-all",
              added
                ? "bg-brand-green hover:bg-brand-green"
                : "bg-brand-orange hover:bg-brand-orange-dark text-white"
            )}
          >
            {adding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : added ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add to Cart
              </>
            )}
          </Button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDecrement}
              className="h-9 w-9 grid place-items-center border border-border rounded-md hover:bg-muted transition text-foreground"
              aria-label="Decrease quantity"
            >
              {inCartQty === 1 ? <Trash2 className="h-3.5 w-3.5 text-red-500" /> : <Minus className="h-3.5 w-3.5" />}
            </button>
            <div className="flex-1 h-9 grid place-items-center bg-brand-green/10 border border-brand-green/30 rounded-md">
              <span className="text-sm font-extrabold text-brand-green">{inCartQty}</span>
            </div>
            <button
              onClick={handleIncrement}
              disabled={!product.isActive}
              className="h-9 w-9 grid place-items-center border border-border rounded-md hover:bg-muted transition text-foreground disabled:opacity-50"
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
