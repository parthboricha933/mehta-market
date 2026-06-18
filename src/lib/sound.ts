'use client'

// Generates a pleasant "ding" notification sound using the Web Audio API.
// No external audio file needed; works on all modern browsers.
// Must be triggered by a user-initiated action OR after the user has interacted
// with the page at least once (browser autoplay policy).

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!audioCtx) {
      const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    // Resume if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

// Two-tone "ding-dong" chime
export function playNotificationSound(): void {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const now = ctx.currentTime

    // First tone (higher)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(880, now)
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15)
    gain1.gain.setValueAtTime(0, now)
    gain1.gain.linearRampToValueAtTime(0.4, now + 0.02)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Second tone (lower) — slight delay for a pleasant chime
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(660, now + 0.18)
    gain2.gain.setValueAtTime(0, now + 0.18)
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.2)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.18)
    osc2.stop(now + 0.5)
  } catch {
    // swallow
  }
}

// "Unlock" the audio context on first user interaction (required by some browsers).
// Call this once when the admin dashboard mounts.
export function primeAudioOnUserInteraction(): () => void {
  if (typeof window === 'undefined') return () => {}
  const unlock = () => {
    const ctx = getCtx()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  }
  const events = ['click', 'keydown', 'touchstart']
  events.forEach((e) => window.addEventListener(e, unlock, { once: false, passive: true }))
  return () => {
    events.forEach((e) => window.removeEventListener(e, unlock))
  }
}
