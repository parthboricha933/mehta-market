// WhatsApp notification scaffold for Mehta Super Market.
//
// This module is intentionally a STUB: it provides a stable interface that the
// order-creation flow already calls into, but does not actually send anything.
// To enable real WhatsApp delivery later, fill in the `sendViaWhatsAppBusinessAPI`
// function below (or any other provider) WITHOUT touching the order API route.
//
// The order-creation flow only depends on `notifyNewOrder(order)` — that function
// signature will not change, so enabling real WhatsApp later is a one-file edit.

export interface NewOrderWhatsAppPayload {
  orderNumber: string
  customerName: string
  mobile: string
  address: string
  total: number
  items: { name: string; quantity: number; price: number }[]
}

export interface WhatsAppSendResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

/**
 * Format an order into a WhatsApp-friendly message body.
 * Exported so it can be reused (e.g. by the admin "Send to WhatsApp" button later).
 */
export function formatOrderForWhatsApp(order: NewOrderWhatsAppPayload): string {
  const itemsList = order.items
    .map((i) => `• ${i.name} x${i.quantity} = ₹${(i.price * i.quantity).toFixed(0)}`)
    .join('\n')
  return (
    `🛒 *New Order - ${order.orderNumber}*\n\n` +
    `👤 *Customer:* ${order.customerName}\n` +
    `📞 *Mobile:* ${order.mobile}\n` +
    `📍 *Address:* ${order.address}\n\n` +
    `*Items:*\n${itemsList}\n\n` +
    `💰 *Total: ₹${order.total.toFixed(0)}*\n\n` +
    `— Mehta Super Market, Rajula`
  )
}

/**
 * Send a WhatsApp message to a recipient.
 *
 * STUB IMPLEMENTATION: logs the would-be message to the server console.
 * To enable real WhatsApp notifications:
 *   1. Sign up for WhatsApp Business API (or a provider like Twilio, MSG91, Gupshup, etc.)
 *   2. Set environment variables: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ADMIN_RECIPIENT
 *   3. Replace the body of `sendViaWhatsAppBusinessAPI` below with a real `fetch` call.
 *
 * The signature of this function will not change, so callers (notifyNewOrder) need no edits.
 */
export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<WhatsAppSendResult> {
  if (!to) {
    return { ok: false, skipped: true, error: 'No recipient provided' }
  }

  // Stub: just log. Replace with real implementation when ready.
  if (process.env.NODE_ENV !== 'production' || process.env.WHATSAPP_DEBUG === '1') {
    console.log('[WhatsApp Notification - STUB]', { to, message })
  }

  // When credentials are configured, dispatch to the real provider:
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return sendViaWhatsAppBusinessAPI(to, message)
  }

  return { ok: true, skipped: true }
}

/**
 * Real WhatsApp Business API call.
 * Currently a no-op placeholder; populate when credentials are available.
 * See: https://developers.facebook.com/docs/whatsapp/cloud-api/get-started
 */
async function sendViaWhatsAppBusinessAPI(to: string, message: string): Promise<WhatsAppSendResult> {
  const token = process.env.WHATSAPP_API_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  try {
    // Example (uncomment and adjust when credentials are set):
    // const res = await fetch(
    //   `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    //   {
    //     method: 'POST',
    //     headers: {
    //       Authorization: `Bearer ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify({
    //       messaging_product: 'whatsapp',
    //       to: to.replace(/\D/g, ''),
    //       type: 'text',
    //       text: { body: message },
    //     }),
    //   },
    // )
    // if (!res.ok) {
    //   return { ok: false, error: `WhatsApp API returned ${res.status}` }
    // }
    // return { ok: true }
    console.log('[WhatsApp] Credentials present but sendViaWhatsAppBusinessAPI not yet implemented.', { to, message })
    return { ok: false, skipped: true, error: 'Not implemented' }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

/**
 * High-level hook called after a new order is created.
 * Non-blocking: logs and swallows errors so it never affects order creation.
 *
 * The shop admin's WhatsApp number is passed in; if absent, this is a no-op.
 */
export async function notifyNewOrder(
  order: NewOrderWhatsAppPayload,
  adminWhatsApp?: string,
): Promise<void> {
  try {
    if (!adminWhatsApp) return
    const message = formatOrderForWhatsApp(order)
    await sendWhatsAppMessage(adminWhatsApp, message)
  } catch (e) {
    // Never throw from notification layer — order creation must not be affected.
    console.error('[WhatsApp] notifyNewOrder failed silently:', e)
  }
}
