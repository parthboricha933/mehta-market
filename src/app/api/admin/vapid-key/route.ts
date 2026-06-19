// GET: Returns the VAPID public key (needed by the browser to subscribe to push).
// Public endpoint — the public key is safe to expose.
import { NextResponse } from 'next/server'
import { getVapidPublicKey } from '@/lib/push'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    enabled: !!getVapidPublicKey(),
  })
}
