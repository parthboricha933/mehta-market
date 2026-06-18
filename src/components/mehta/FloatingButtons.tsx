'use client'

import { useEffect, useState } from 'react'
import { Phone, X, MessageCircle } from 'lucide-react'
import type { ShopInfo } from '@/lib/types'

export function FloatingButtons({ shopInfo }: { shopInfo: ShopInfo | null }) {
  const [visible, setVisible] = useState(false)
  const [showCall, setShowCall] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const phone = shopInfo?.phone || '+919876543210'
  const whatsapp = (shopInfo?.whatsapp || '+919876543210').replace('+', '')

  return (
    <>
      {/* Floating action buttons - bottom right */}
      <div className={`fixed bottom-4 right-4 z-30 flex flex-col items-end gap-3 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {showCall && (
          <div className="bg-white rounded-xl shadow-2xl p-3 mb-1 flex items-center gap-2 animate-slide-in-right">
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-green text-white rounded-lg font-semibold text-sm hover:bg-brand-green-dark"
            >
              <Phone className="h-4 w-4" /> Call Now
            </a>
            <button
              onClick={() => setShowCall(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {!showCall && (
          <button
            onClick={() => setShowCall(true)}
            aria-label="Call now"
            className="h-12 w-12 rounded-full bg-brand-green text-white grid place-items-center shadow-xl hover:scale-110 transition animate-pulse-glow"
          >
            <Phone className="h-5 w-5" />
          </button>
        )}

        <a
          href={`https://wa.me/${whatsapp}?text=Hi%20Mehta%20Super%20Market%2C%20I%20would%20like%20to%20place%20an%20order.`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat on WhatsApp"
          className="h-14 w-14 rounded-full bg-[#25D366] text-white grid place-items-center shadow-2xl hover:scale-110 transition"
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.943-11.892a11.821 11.821 0 00-3.495-8.413Z"/></svg>
        </a>
      </div>
    </>
  )
}
