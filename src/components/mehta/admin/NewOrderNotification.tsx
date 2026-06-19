'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, ShoppingBag, User, IndianRupee, Clock, ArrowRight, Bell } from 'lucide-react'
import type { NewOrderEvent } from '@/lib/use-admin-socket'

interface Props {
  event: NewOrderEvent | null
  onClose: () => void
  onView: (orderId: string) => void
}

export function NewOrderNotification({ event, onClose, onView }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (event) {
      setVisible(true)
      // Auto-hide after 12 seconds if not interacted with
      const t = setTimeout(() => {
        setVisible(false)
        setTimeout(onClose, 300)
      }, 12000)
      return () => clearTimeout(t)
    }
  }, [event, onClose])

  if (!event) return null

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const handleView = () => {
    onView(event.orderId)
    handleClose()
  }

  return (
    <div
      className={`fixed top-20 right-4 z-[100] w-[calc(100vw-2rem)] max-w-sm transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
      role="alert"
      aria-live="assertive"
    >
      <Card className="p-0 overflow-hidden border-2 border-brand-orange shadow-2xl">
        {/* Header strip */}
        <div className="bg-gradient-to-r from-brand-orange to-brand-orange-dark text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Bell className="h-4 w-4 animate-pulse" />
            New Order Received!
          </div>
          <button
            onClick={handleClose}
            aria-label="Close notification"
            className="text-white/80 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 bg-white space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-brand-green/10 text-brand-green grid place-items-center flex-shrink-0">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-foreground">Order {event.orderNumber}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(event.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-extrabold text-brand-green flex items-center">
                <IndianRupee className="h-3.5 w-3.5" />
                {event.total.toFixed(0)}
              </div>
              <div className="text-[10px] text-muted-foreground">{event.itemCount} {event.itemCount === 1 ? 'item' : 'items'}</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm bg-muted/50 rounded-md px-2 py-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="font-semibold text-foreground truncate">{event.customerName}</span>
            <span className="text-xs text-muted-foreground">• {event.mobile}</span>
          </div>

          <Button
            onClick={handleView}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold text-sm h-9"
          >
            View Order <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
