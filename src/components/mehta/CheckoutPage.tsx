'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, MapPin, Truck, ShieldCheck, Loader2, AlertCircle, Info, Ticket, Check, X } from 'lucide-react'
import { useCart, cartSubtotal } from '@/lib/stores/cart'
import { useNav } from '@/lib/stores/nav'
import { toast } from 'sonner'
import type { ShopInfo } from '@/lib/types'

export function CheckoutPage({ shopInfo }: { shopInfo: ShopInfo | null }) {
  const { items, clearCart } = useCart()
  const { setView, setLastOrderNumber } = useNav()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    customerName: '',
    mobile: '',
    address: '',
    landmark: '',
    notes: '',
  })

  // Coupon state
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  const subtotal = cartSubtotal(items)
  const freeDeliveryThreshold = shopInfo?.minOrderForFreeDelivery || 500
  const deliveryCharge = shopInfo?.deliveryCharge || 30
  const charge = subtotal >= freeDeliveryThreshold ? 0 : deliveryCharge
  const total = Math.max(0, subtotal - couponDiscount + charge)

  const handleApplyCoupon = async () => {
    setCouponError(null)
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code')
      return
    }
    setCouponLoading(true)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, subtotal }),
      })
      const data = await res.json()
      if (data.valid) {
        setCouponDiscount(data.discount)
        setAppliedCoupon(data.coupon)
        toast.success(`Coupon applied: ${data.coupon.code}`, {
          description: `You saved ₹${data.discount.toFixed(0)}!`,
        })
      } else {
        setCouponError(data.error || 'Invalid coupon')
        setCouponDiscount(0)
        setAppliedCoupon(null)
      }
    } catch {
      setCouponError('Failed to validate coupon')
      setCouponDiscount(0)
      setAppliedCoupon(null)
    } finally {
      setCouponLoading(false)
    }
  }

  const handleRemoveCoupon = () => {
    setCouponCode('')
    setCouponDiscount(0)
    setAppliedCoupon(null)
    setCouponError(null)
  }

  const handlePlaceOrder = async () => {
    setError(null)
    if (!form.customerName.trim()) return setError('Please enter your name')
    if (!form.mobile.trim() || !/^[6-9]\d{9}$/.test(form.mobile.replace(/\D/g, ''))) return setError('Please enter a valid 10-digit mobile number starting with 6, 7, 8 or 9')
    if (!form.address.trim()) return setError('Please enter your delivery address')
    if (items.length === 0) return setError('Your cart is empty')

    // Verify Rajula delivery area
    const fullAddress = (form.address + ' ' + form.landmark).toLowerCase()
    if (!fullAddress.includes('rajula')) {
      setError('Sorry, home delivery is available only within Rajula city. Please ensure your address includes "Rajula" as the city.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: items.map((i) => ({
            productId: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image,
          })),
          subtotal,
          deliveryCharge: charge,
          total,
          couponCode: appliedCoupon?.code || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to place order')

      setLastOrderNumber(data.order.orderNumber)
      clearCart()
      setView('order-success')
      toast.success('Order placed successfully!')
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="h-24 w-24 mx-auto rounded-full bg-muted grid place-items-center mb-4">
          <Truck className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-sm text-muted-foreground mb-4">Add some products before checking out</p>
        <Button onClick={() => setView('shop')} className="bg-brand-orange hover:bg-brand-orange-dark text-white">
          Start Shopping
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <button
        onClick={() => setView('shop')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Continue Shopping
      </button>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-1">Checkout</h1>
      <p className="text-sm text-muted-foreground mb-5">Enter your delivery details to place your order</p>

      {/* Delivery restriction notice */}
      <Alert className="mb-5 border-brand-orange/30 bg-brand-orange/5">
        <MapPin className="h-4 w-4 text-brand-orange" />
        <AlertDescription className="text-sm">
          <span className="font-bold text-brand-orange-dark">Delivery Area:</span>{' '}
          Home delivery is available <span className="font-semibold">only within Rajula city</span>. Please ensure your address includes "Rajula" as the city name. Orders outside Rajula will not be accepted.
        </AlertDescription>
      </Alert>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 space-y-4">
            <h2 className="font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-brand-green" /> Delivery Details
            </h2>
            <Separator />

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Full Name *</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mobile">Mobile Number *</Label>
                <Input
                  id="mobile"
                  type="tel"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '') })}
                  placeholder="10-digit mobile number"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Delivery Address *</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="House/Flat number, street name, area, Rajula"
                rows={3}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" /> Address must include "Rajula" as city for home delivery
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input
                  id="landmark"
                  value={form.landmark}
                  onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                  placeholder="Near temple, school, etc."
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Order Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any special instructions"
                />
              </div>
            </div>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold text-foreground">Order Summary</h2>
            <Separator />

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex gap-2 text-sm">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded-md object-cover bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} × ₹{item.price.toFixed(0)} = <span className="font-semibold text-foreground">₹{(item.quantity * item.price).toFixed(0)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Coupon input */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" /> Have a coupon code?
              </Label>
              {appliedCoupon ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-800">{appliedCoupon.code}</p>
                    <p className="text-xs text-emerald-600">
                      {appliedCoupon.discountType === 'FIXED'
                        ? `₹${appliedCoupon.discountValue} off`
                        : `${appliedCoupon.discountValue}% off`}
                      {' • Saved ₹'}{couponDiscount.toFixed(0)}
                    </p>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-emerald-600 hover:text-red-600 transition"
                    aria-label="Remove coupon"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null) }}
                    placeholder="Enter code"
                    className="flex-1 uppercase"
                    maxLength={20}
                  />
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    size="sm"
                    variant="outline"
                    className="border-brand-green text-brand-green hover:bg-brand-green/10"
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {couponError}
                </p>
              )}
            </div>

            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">₹{subtotal.toFixed(0)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Coupon Discount</span>
                  <span className="font-semibold">-₹{couponDiscount.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Charge</span>
                {charge === 0 ? (
                  <span className="font-semibold text-brand-green">FREE</span>
                ) : (
                  <span className="font-semibold">₹{charge.toFixed(0)}</span>
                )}
              </div>
              {charge > 0 && (
                <p className="text-xs text-brand-orange-dark">
                  Add ₹{(freeDeliveryThreshold - subtotal).toFixed(0)} more for free delivery
                </p>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between text-base">
                <span className="font-bold">Total</span>
                <span className="font-extrabold text-brand-green">₹{total.toFixed(0)}</span>
              </div>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 text-base"
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Placing Order...</>
              ) : (
                <>Place Order • ₹{total.toFixed(0)}</>
              )}
            </Button>

            <p className="text-[11px] text-center text-muted-foreground">
              By placing order, you agree to receive delivery in Rajula city.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
