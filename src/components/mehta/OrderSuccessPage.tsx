'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Home, Phone, MapPin, Clock } from 'lucide-react'
import { useNav } from '@/lib/stores/nav'

export function OrderSuccessPage() {
  const { lastOrderNumber, setView } = useNav()

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      <Card className="p-8 text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-brand-green/10 grid place-items-center mb-4 animate-bounce-in">
          <CheckCircle2 className="h-14 w-14 text-brand-green" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-muted-foreground mb-5">
          Thank you for your order. We&apos;ll call you shortly to confirm your delivery.
        </p>

        {lastOrderNumber && (
          <div className="inline-flex flex-col items-center bg-brand-orange/10 border border-brand-orange/30 px-6 py-3 rounded-xl mb-5">
            <span className="text-xs font-semibold text-brand-orange-dark uppercase tracking-wide">Your Order Number</span>
            <span className="text-2xl font-extrabold text-brand-green tracking-wide">{lastOrderNumber}</span>
          </div>
        )}

        <div className="grid sm:grid-cols-3 gap-3 my-6 text-left">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Clock className="h-5 w-5 text-brand-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Estimated Delivery</p>
              <p className="text-[11px] text-muted-foreground">Within 2 hours</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <Phone className="h-5 w-5 text-brand-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Confirmation Call</p>
              <p className="text-[11px] text-muted-foreground">You&apos;ll get a call soon</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
            <MapPin className="h-5 w-5 text-brand-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-foreground">Delivery Area</p>
              <p className="text-[11px] text-muted-foreground">Rajula city only</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setView('home')}
            className="bg-brand-green hover:bg-brand-green-dark text-white font-semibold"
          >
            <Home className="h-4 w-4 mr-2" /> Back to Home
          </Button>
          <Button
            onClick={() => setView('shop')}
            variant="outline"
            className="font-semibold"
          >
            Continue Shopping
          </Button>
        </div>
      </Card>
    </div>
  )
}
