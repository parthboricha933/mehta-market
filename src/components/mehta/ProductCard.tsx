'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Plus, Minus, ShoppingCart, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '@/lib/stores/cart'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCart((s) => s.addItem)
  const image = product.images?.[0] || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=400&q=70'

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0

  const handleAdd = () => {
    setAdding(true)
    setTimeout(() => {
      for (let i = 0; i < qty; i++) {
        addItem({
          id: product.id,
          name: product.name,
          price: product.price,
          mrp: product.mrp,
          image,
          unit: product.unit || '',
        })
      }
      setAdding(false)
      setAdded(true)
      // Show toast notification (cart does NOT auto-open)
      toast.success('Item added to cart', {
        description: `${qty} × ${product.name}`,
        duration: 2000,
      })
      setTimeout(() => setAdded(false), 1500)
    }, 250)
  }

  return (
    <Card className="group relative overflow-hidden p-0 border-border hover:border-brand-green hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {discount > 0 && (
        <div className="absolute top-2 left-2 z-10 bg-brand-orange text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
          {discount}% OFF
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
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
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

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-8 w-8 grid place-items-center hover:bg-muted transition"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-7 text-center text-sm font-semibold">{qty}</span>
            <button
              onClick={() => setQty((q) => q + 1)}
              className="h-8 w-8 grid place-items-center hover:bg-muted transition"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <Button
            onClick={handleAdd}
            disabled={!product.isActive || adding}
            size="sm"
            className={cn(
              "flex-1 h-8 text-xs font-bold transition-all",
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
                <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
