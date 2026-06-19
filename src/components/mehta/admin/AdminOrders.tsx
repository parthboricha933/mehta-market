'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingCart, Phone, MapPin, Clock, Loader2, Printer, Eye, Check, X, Truck
} from 'lucide-react'
import { toast } from 'sonner'
import type { Order } from '@/lib/types'
import { useAdmin } from '@/lib/stores/admin'
import type { NewOrderEvent } from '@/lib/use-admin-socket'

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
  DELIVERED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
}

// Build a minimal Order object from a real-time NewOrderEvent payload so it can
// be prepended to the local list instantly. The items array is populated with
// placeholder entries (one per itemCount) so `items.length` renders correctly;
// when the admin opens the detail modal we fetch the full order from the API
// to replace these placeholders with real line items.
function eventToOrder(event: NewOrderEvent): Order {
  return {
    id: event.orderId,
    orderNumber: event.orderNumber,
    customerName: event.customerName,
    mobile: event.mobile,
    address: event.address,
    landmark: '',
    notes: '',
    items: Array.from({ length: event.itemCount }, (_, i) => ({
      id: `placeholder-${i}`,
      orderId: event.orderId,
      productId: '',
      name: '',
      price: 0,
      quantity: 0,
      image: null,
    })),
    subtotal: event.total,
    deliveryCharge: 0,
    total: event.total,
    status: 'PENDING',
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
  }
}

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState<Order | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Subscribe to real-time new-order events from the shared admin store.
  // The SSE hook in AdminDashboard publishes events here; we react by
  // prepending the new order to the local list (with dedup) without reloading.
  const lastNewOrderEvent = useAdmin((s) => s.lastNewOrderEvent)
  const lastNewOrderSeq = useAdmin((s) => s.lastNewOrderSeq)
  const seenOrderIdsRef = useRef<Set<string>>(new Set())

  const load = () => {
    setLoading(true)
    fetch(`/api/orders?status=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Order[] = d.orders || []
        setOrders(list)
        // Refresh the dedup set so future real-time events don't re-add orders
        // that are already in the freshly loaded list.
        seenOrderIdsRef.current = new Set(list.map((o) => o.id))
        console.log('[orders] Loaded', list.length, 'orders from API, dedup set updated')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  // Real-time handler: when a new-order event arrives via SSE (published to the
  // store by the useAdminSSE hook), prepend it to the list instantly.
  // Dedup via the seenOrderIdsRef set prevents duplicate entries.
  useEffect(() => {
    if (!lastNewOrderEvent) return
    const event = lastNewOrderEvent
    console.log('[orders] 📦 Real-time event received:', event.orderNumber, '| seq:', lastNewOrderSeq, '| filter:', filter)

    // Dedup: skip if we've already seen this order id
    if (seenOrderIdsRef.current.has(event.orderId)) {
      console.log('[orders] ⏭️ Skipping duplicate order:', event.orderNumber)
      return
    }
    seenOrderIdsRef.current.add(event.orderId)
    console.log('[orders] ✅ Added to dedup set:', event.orderId)

    // New orders are always PENDING. Only prepend if the current filter would
    // include a PENDING order (i.e., filter is "all" or "pending").
    if (filter !== 'all' && filter !== 'pending') {
      console.log('[orders] ⏭️ Skipping — current filter:', filter, '(order is PENDING)')
      return
    }

    const newOrder = eventToOrder(event)
    setOrders((prev) => {
      // Extra guard against duplicate ids in state (paranoid dedup)
      if (prev.some((o) => o.id === newOrder.id)) {
        console.log('[orders] ⏭️ Order already in state, not adding')
        return prev
      }
      // Prepend — newest first
      console.log('[orders] ✅ Prepending new order to list. New count:', prev.length + 1)
      return [newOrder, ...prev]
    })
  }, [lastNewOrderSeq, lastNewOrderEvent, filter])

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      toast.success(`Order ${status.toLowerCase()}`)
      // Update the order in local state immediately so the UI reflects the
      // status change without waiting for a refetch.
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: status.toUpperCase() as Order['status'] } : o)))
      // If the current filter no longer matches the new status, remove the order.
      // (e.g., after accepting a PENDING order while on the "pending" tab, it should disappear.)
      const newStatus = status.toUpperCase()
      if (filter !== 'all' && filter !== newStatus.toLowerCase()) {
        setOrders((prev) => prev.filter((o) => o.id !== id))
      }
      if (viewing?.id === id) {
        setViewing((v) => (v ? { ...v, status: newStatus as Order['status'] } : v))
      }
    } catch {
      toast.error('Failed to update order')
    }
  }

  // Fetch the full order (with line items) before opening the detail modal.
  // This is needed for orders that arrived via real-time event (which only
  // carry summary data), but is harmless for orders loaded from the API
  // (it just re-fetches the same data).
  const openOrderDetail = async (o: Order) => {
    setViewing(o)
    // If items are already populated with real data (name !== ''), skip refetch.
    const hasRealItems = o.items.length > 0 && o.items.some((i) => i.name !== '')
    if (hasRealItems) return
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/orders/${o.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data?.order) {
          setViewing(data.order as Order)
          // Also update the local list so future opens don't refetch.
          setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...data.order } : x)))
        }
      }
    } catch {
      // ignore — modal will show whatever data we have
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Orders</h1>
        <p className="text-sm text-muted-foreground">{orders.length} orders • Real-time updates</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="accepted">Accepted</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center">
          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold mb-1">No orders found</p>
          <p className="text-sm text-muted-foreground">New orders will appear here automatically</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="p-4 hover:shadow-md transition">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground">{o.orderNumber}</span>
                    <Badge className={STATUS_COLORS[o.status]} variant="outline">{o.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-brand-green">₹{o.total.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground">{o.items.length} {o.items.length === 1 ? 'item' : 'items'}</div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 mb-3 text-sm">
                <div>
                  <p className="font-semibold">{o.customerName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <a href={`tel:${o.mobile}`} className="hover:underline">{o.mobile}</a>
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  <span className="line-clamp-2">{o.address}{o.landmark ? `, ${o.landmark}` : ''}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openOrderDetail(o)}>
                  <Eye className="h-3 w-3 mr-1" /> View / Print
                </Button>
                {o.status === 'PENDING' && (
                  <>
                    <Button size="sm" className="h-7 text-xs bg-brand-green hover:bg-brand-green-dark text-white" onClick={() => updateStatus(o.id, 'ACCEPTED')}>
                      <Check className="h-3 w-3 mr-1" /> Accept
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => updateStatus(o.id, 'REJECTED')}>
                      <X className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {o.status === 'ACCEPTED' && (
                  <Button size="sm" className="h-7 text-xs bg-brand-orange hover:bg-brand-orange-dark text-white" onClick={() => updateStatus(o.id, 'DELIVERED')}>
                    <Truck className="h-3 w-3 mr-1" /> Mark Delivered
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Order detail modal */}
      {viewing && (
        <Dialog open onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Order Details
                <Badge className={STATUS_COLORS[viewing.status]} variant="outline">{viewing.status}</Badge>
              </DialogTitle>
            </DialogHeader>

            {loadingDetail ? (
              <div className="py-10 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
                <p className="text-sm text-muted-foreground">Loading order details...</p>
              </div>
            ) : (
            <div id="invoice-print" className="space-y-4">
              {/* Invoice header */}
              <div className="text-center pb-3 border-b">
                <div className="text-xl font-extrabold text-brand-green">Mehta Super Market</div>
                <p className="text-xs text-muted-foreground">Main Bazar, Rajula, Amreli, Gujarat 365560</p>
                <p className="text-xs text-muted-foreground">Phone: +91 98765 43210</p>
                <p className="text-sm font-bold mt-2">Invoice: {viewing.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(viewing.createdAt).toLocaleString('en-IN')}
                </p>
              </div>

              {/* Customer */}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-bold text-foreground mb-1">Customer Details:</p>
                  <p>{viewing.customerName}</p>
                  <p className="text-muted-foreground">{viewing.mobile}</p>
                  <p className="text-muted-foreground text-xs mt-1">{viewing.address}</p>
                  {viewing.landmark && <p className="text-muted-foreground text-xs">Landmark: {viewing.landmark}</p>}
                  {viewing.notes && <p className="text-muted-foreground text-xs">Notes: {viewing.notes}</p>}
                </div>
              </div>

              <Separator />

              {/* Items */}
              <div>
                <p className="font-bold text-foreground mb-2">Items Ordered:</p>
                <div className="space-y-2">
                  {viewing.items.map((item) => (
                    <div key={item.id} className="flex gap-3 text-sm">
                      <img src={item.image || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=80&q=70'} alt="" className="h-12 w-12 rounded-md object-cover bg-muted" />
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × ₹{item.price.toFixed(0)}</p>
                      </div>
                      <div className="font-semibold">₹{(item.quantity * item.price).toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{viewing.subtotal.toFixed(0)}</span></div>
                {viewing.couponCode && viewing.couponDiscount && viewing.couponDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Coupon ({viewing.couponCode})</span>
                    <span>-₹{viewing.couponDiscount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Delivery Charge</span><span>{viewing.deliveryCharge === 0 ? 'FREE' : `₹${viewing.deliveryCharge.toFixed(0)}`}</span></div>
                <Separator className="my-2" />
                <div className="flex justify-between font-extrabold text-base"><span>Total</span><span className="text-brand-green">₹{viewing.total.toFixed(0)}</span></div>
              </div>

              <p className="text-center text-xs text-muted-foreground pt-2 border-t">
                Thank you for shopping with Mehta Super Market!
              </p>
            </div>
            )}

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => window.print()} disabled={loadingDetail}>
                <Printer className="h-4 w-4 mr-1" /> Print Invoice
              </Button>
              <DialogClose asChild>
                <Button>Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
