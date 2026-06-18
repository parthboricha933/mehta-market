'use client'

import { Button } from '@/components/ui/button'
import { ShoppingBag, Truck, Clock, Shield, MapPin, Star } from 'lucide-react'
import { useNav } from '@/lib/stores/nav'

export function Hero() {
  const setView = useNav((s) => s.setView)

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-green via-brand-green-light to-brand-green-dark text-white">
      {/* Decorative background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-orange/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-orange/20 blur-3xl" />
        <div className="absolute top-1/2 right-1/3 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="container relative mx-auto px-4 py-12 sm:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-5 border border-white/20 animate-bounce-in">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange-light opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-orange"></span>
              </span>
              <MapPin className="h-4 w-4" />
              Home Delivery Available in Rajula
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-4">
              Fresh Groceries Delivered to Your <span className="text-brand-orange-light">Doorstep</span> in Rajula
            </h1>

            <p className="text-white/90 text-base sm:text-lg mb-7 max-w-xl mx-auto lg:mx-0">
              Shop from a wide range of fresh fruits, vegetables, dairy, snacks, grocery & household items. Get them delivered at your home in Rajula - fast, fresh & affordable.
            </p>

            <div className="flex flex-wrap gap-3 justify-center lg:justify-start mb-7">
              <Button
                onClick={() => setView('shop')}
                size="lg"
                className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold px-7 py-3 text-base shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <ShoppingBag className="h-5 w-5 mr-2" />
                Shop Now
              </Button>
              <a
                href="https://wa.me/919876543210?text=Hi%20Mehta%20Super%20Market%2C%20I%20would%20like%20to%20place%20an%20order."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-white text-brand-green font-bold px-6 py-3 rounded-md text-base shadow-lg hover:shadow-xl hover:bg-brand-cream transition-all hover:scale-105"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.148-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.359.101 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.582 0 11.94-5.359 11.943-11.892a11.821 11.821 0 00-3.495-8.413Z"/></svg>
                Order on WhatsApp
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
              <div className="text-center lg:text-left">
                <Truck className="h-5 w-5 mx-auto lg:mx-0 mb-1 text-brand-orange-light" />
                <div className="text-xs font-semibold text-white/80">Free Delivery</div>
                <div className="text-[10px] text-white/60">On orders ₹500+</div>
              </div>
              <div className="text-center lg:text-left">
                <Clock className="h-5 w-5 mx-auto lg:mx-0 mb-1 text-brand-orange-light" />
                <div className="text-xs font-semibold text-white/80">7 AM - 10 PM</div>
                <div className="text-[10px] text-white/60">Daily Open</div>
              </div>
              <div className="text-center lg:text-left">
                <Shield className="h-5 w-5 mx-auto lg:mx-0 mb-1 text-brand-orange-light" />
                <div className="text-xs font-semibold text-white/80">100% Fresh</div>
                <div className="text-[10px] text-white/60">Quality Assured</div>
              </div>
            </div>
          </div>

          {/* Right hero image */}
          <div className="relative hidden lg:block">
            <div className="relative animate-float">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=75"
                alt="Fresh groceries delivery"
                className="rounded-3xl shadow-2xl w-full h-[460px] object-cover border-4 border-white/20"
                loading="eager"
              />
              {/* Floating cards */}
              <div className="absolute -top-5 -left-5 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 max-w-[180px]">
                <div className="h-10 w-10 rounded-full bg-brand-green/10 grid place-items-center text-brand-green text-xl">🥬</div>
                <div>
                  <div className="text-xs font-bold text-foreground">Fresh Veggies</div>
                  <div className="text-[10px] text-muted-foreground">Daily sourced</div>
                </div>
              </div>
              <div className="absolute -bottom-5 -right-5 bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2 max-w-[200px]">
                <div className="h-10 w-10 rounded-full bg-brand-orange/10 grid place-items-center text-brand-orange text-xl">🚚</div>
                <div>
                  <div className="text-xs font-bold text-foreground">Fast Delivery</div>
                  <div className="text-[10px] text-muted-foreground">Within Rajula city</div>
                </div>
              </div>
              <div className="absolute top-1/2 -right-8 bg-brand-orange text-white rounded-2xl shadow-xl p-3 flex items-center gap-2">
                <Star className="h-5 w-5 fill-white" />
                <div>
                  <div className="text-sm font-extrabold leading-none">4.8/5</div>
                  <div className="text-[10px] opacity-90">Customer rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="relative">
        <svg viewBox="0 0 1440 60" className="w-full h-8 sm:h-12" preserveAspectRatio="none">
          <path d="M0,30 C240,60 480,0 720,20 C960,40 1200,60 1440,20 L1440,60 L0,60 Z" fill="white"/>
        </svg>
      </div>
    </section>
  )
}
