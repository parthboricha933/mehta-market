'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useCart, cartSubtotal, cartCount } from '@/lib/stores/cart'
import { useNav } from '@/lib/stores/nav'
import { Plus, Minus, Trash2, ShoppingCart, ArrowRight, Truck } from 'lucide-react'
import type { ShopInfo } from '@/lib/types'

export function CartDrawer({ shopInfo }: { shopInfo: ShopInfo | null }) {
  const { items, isOpen, closeCart, updateQuantity, removeItem } = useCart()
  const setView = useNav((s) => s.setView)

  const subtotal = cartSubtotal(items)
  const count = cartCount(items)
  const freeDeliveryThreshold = shopInfo?.minOrderForFreeDelivery || 500
  const deliveryCharge = shopInfo?.deliveryCharge || 30
  const charge = subtotal >= freeDeliveryThreshold || subtotal === 0 ? 0 : deliveryCharge
  const total = subtotal + charge
  const toFreeDelivery = Math.max(0, freeDeliveryThreshold - subtotal)

  const handleCheckout = () => {
    closeCart()
    setView('checkout')
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && closeCart()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-4 py-4 border-b bg-brand-green text-white">
          <SheetTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="h-5 w-5" />
            Your Cart
            {count > 0 && (
              <span className="ml-auto bg-brand-orange text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {count} {count === 1 ? 'item' : 'items'}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="h-24 w-24 rounded-full bg-muted grid place-items-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Add some fresh items to get started</p>
            </div>
            <Button
              onClick={() => { closeCart(); setView('shop') }}
              className="bg-brand-orange hover:bg-brand-orange-dark text-white"
            >
              Start Shopping
            </Button>
          </div>
        ) : (
          <>
            {/* Free delivery progress */}
            {toFreeDelivery > 0 ? (
              <div className="bg-brand-orange/10 border-b border-brand-orange/20 px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-brand-orange-dark mb-1.5">
                  <Truck className="h-3.5 w-3.5" />
                  Add ₹{toFreeDelivery.toFixed(0)} more for FREE delivery!
                </div>
                <div className="h-1.5 bg-brand-orange/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-orange transition-all"
                    style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-brand-green/10 border-b border-brand-green/20 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-brand-green">
                <Truck className="h-3.5 w-3.5" /> You get FREE delivery! 🎉
              </div>
            )}

            {/* Items list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 p-2 rounded-lg border bg-white hover:shadow-sm transition">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-16 w-16 rounded-md object-cover bg-muted flex-shrink-0"
                    loading="lazy"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold line-clamp-2 leading-tight">{item.name}</h4>
                    {item.unit && <p className="text-[11px] text-muted-foreground">{item.unit}</p>}
                    <p className="text-sm font-bold text-brand-green mt-0.5">₹{item.price.toFixed(0)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted-foreground hover:text-red-500 transition"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex items-center border border-border rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-6 w-6 grid place-items-center hover:bg-muted"
                        aria-label="Decrease"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-6 w-6 grid place-items-center hover:bg-muted"
                        aria-label="Increase"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with totals */}
            <div className="border-t bg-white p-4 space-y-3">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Charge</span>
                  {charge === 0 ? (
                    <span className="font-semibold text-brand-green">FREE</span>
                  ) : (
                    <span className="font-semibold">₹{charge.toFixed(0)}</span>
                  )}
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-extrabold text-brand-green">₹{total.toFixed(0)}</span>
                </div>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3"
              >
                Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                🚚 Home delivery available only in Rajula city
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
