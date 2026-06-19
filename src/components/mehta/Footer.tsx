'use client'

import { MapPin, Phone, Clock, Mail, Truck, Shield } from 'lucide-react'
import { useNav } from '@/lib/stores/nav'
import type { ShopInfo } from '@/lib/types'

export function Footer({ shopInfo }: { shopInfo: ShopInfo | null }) {
  const setView = useNav((s) => s.setView)

  const phone = shopInfo?.phone || '+919876543210'
  const whatsapp = shopInfo?.whatsapp || '+919876543210'

  return (
    <footer className="mt-auto bg-gradient-to-br from-brand-green-dark to-brand-green text-white">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-10 w-10 rounded-lg bg-white grid place-items-center text-brand-green font-extrabold text-xl shadow-md">
                M
              </div>
              <div className="leading-none">
                <div className="font-extrabold text-base">
                  Mehta <span className="text-brand-orange-light">Super Market</span>
                </div>
                <div className="text-[10px] text-white/70">Rajula • Since 1995</div>
              </div>
            </div>
            <p className="text-sm text-white/80 mb-4 leading-relaxed">
              Your trusted neighborhood supermarket in Rajula. Fresh groceries, fruits, vegetables, dairy & more - delivered to your doorstep.
            </p>
            <div className="flex gap-2">
              <a
                href={`https://wa.me/${whatsapp.replace('+', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.943-11.892a11.821 11.821 0 00-3.495-8.413Z"/></svg>
              </a>
              <a
                href={`tel:${phone}`}
                aria-label="Call"
                className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 transition"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-base mb-3 text-brand-orange-light">Quick Links</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><button onClick={() => setView('home')} className="hover:text-white">Home</button></li>
              <li><button onClick={() => setView('shop')} className="hover:text-white">Shop All</button></li>
              <li><button onClick={() => setView('shop')} className="hover:text-white">Today&apos;s Offers</button></li>
              <li><button onClick={() => setView('admin-login')} className="hover:text-white">Admin Login</button></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-base mb-3 text-brand-orange-light">Categories</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li><button onClick={() => { useNav.getState().setCategory('grocery'); setView('shop') }} className="hover:text-white">Grocery</button></li>
              <li><button onClick={() => { useNav.getState().setCategory('fruits'); setView('shop') }} className="hover:text-white">Fruits & Vegetables</button></li>
              <li><button onClick={() => { useNav.getState().setCategory('dairy'); setView('shop') }} className="hover:text-white">Dairy</button></li>
              <li><button onClick={() => { useNav.getState().setCategory('snacks'); setView('shop') }} className="hover:text-white">Snacks & Beverages</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-base mb-3 text-brand-orange-light">Get in Touch</h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{shopInfo?.address || 'Main Bazar, Rajula, Amreli, Gujarat 365560'}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href={`tel:${phone}`} className="hover:text-white">{phone}</a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 flex-shrink-0" />
                <span>{shopInfo?.hours || '7:00 AM - 10:00 PM Daily'}</span>
              </li>
              <li className="flex items-start gap-2">
                <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>Home delivery in Rajula city only<br/>Free on orders above ₹{shopInfo?.minOrderForFreeDelivery || 500}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-white/70">
          <p>© {new Date().getFullYear()} Mehta Super Market, Rajula. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Secure Shopping • Quality Assured
          </p>
        </div>
      </div>
    </footer>
  )
}
