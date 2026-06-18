'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Sparkles, Tag } from 'lucide-react'
import { useNav } from '@/lib/stores/nav'
import type { OfferPopup as OfferPopupType } from '@/lib/types'

export function OfferPopup({ popup }: { popup: OfferPopupType | null }) {
  const [open, setOpen] = useState(false)
  const setView = useNav((s) => s.setView)

  useEffect(() => {
    if (!popup?.enabled) return
    const seen = sessionStorage.getItem('mehta_popup_seen')
    if (!seen) {
      const t = setTimeout(() => setOpen(true), 1500)
      return () => clearTimeout(t)
    }
  }, [popup?.enabled])

  const handleClose = (open: boolean) => {
    setOpen(open)
    if (!open) sessionStorage.setItem('mehta_popup_seen', '1')
  }

  if (!popup?.enabled) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0 border-0 [&>button]:hidden">
        <DialogClose asChild>
          <button
            aria-label="Close popup"
            className="absolute right-3 top-3 z-20 grid place-items-center h-9 w-9 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogClose>
        {popup.image && (
          <div className="relative h-44 sm:h-52 bg-muted overflow-hidden">
            <img
              src={popup.image}
              alt={popup.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-green/80 via-brand-green/20 to-transparent" />
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              <Sparkles className="h-3.5 w-3.5" /> Limited Time
            </div>
          </div>
        )}
        <div className="p-6 bg-white">
          <div className="flex items-center gap-2 mb-2 text-brand-orange">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Special Offer</span>
          </div>
          <h2 className="text-2xl font-extrabold text-brand-green mb-2 leading-tight">
            {popup.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {popup.description}
          </p>
          <Button
            onClick={() => {
              handleClose(false)
              setView('shop')
            }}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3 text-base shadow-md hover:shadow-lg transition-all"
          >
            {popup.ctaText || 'Shop Now'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
