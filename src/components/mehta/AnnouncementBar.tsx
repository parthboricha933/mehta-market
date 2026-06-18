'use client'

import { Megaphone } from 'lucide-react'

export function AnnouncementBar({ messages }: { messages: string[] }) {
  if (!messages?.length) return null
  // Duplicate the messages twice for seamless looping
  const doubled = [...messages, ...messages]

  return (
    <div className="marquee-container relative bg-gradient-to-r from-brand-green via-brand-green-light to-brand-green text-white py-2.5 overflow-hidden text-sm font-medium">
      <div className="flex items-center">
        <div className="hidden sm:flex items-center gap-1.5 bg-brand-orange px-3 py-1 rounded-full ml-3 mr-3 flex-shrink-0 font-bold shadow-md">
          <Megaphone className="h-3.5 w-3.5" />
          <span className="text-xs">Announcement</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div className="animate-marquee">
            {doubled.map((m, i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-2">
                <span className="text-brand-orange-light">★</span>
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
