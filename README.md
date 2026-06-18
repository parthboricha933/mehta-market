# 🛒 Mehta Super Market — Rajula

A modern, mobile-friendly e-commerce website for **Mehta Super Market, Rajula** (Gujarat, India). Customers can browse groceries, fruits, vegetables, dairy, snacks, beverages, and household items, then place orders for **home delivery within Rajula city only**.

Built with Next.js 16, TypeScript, Tailwind CSS, Prisma, and real-time WebSocket notifications.

---

## ✨ Features

### Customer-Facing
- 🏠 **Homepage** with hero banner, category strip, featured products, best sellers, and promo banners
- 📢 **Auto-scrolling announcement bar** (admin-editable)
- 🎁 **Offer popup** that appears once per session (admin-editable)
- 🛍️ **Product catalog** with 7 categories, search, sort, and filter
- 🛒 **Cart drawer** with quantity controls and free-delivery progress bar
- 📝 **Checkout** with name, mobile, address, landmark, and order notes
- 🚚 **Rajula-only delivery restriction** (enforced both client-side and server-side)
- 💚 **WhatsApp + Call floating buttons** for instant ordering
- 📱 **PWA support** — installable as a mobile app
- ⚡ **Lazy-loaded images**, fast loading, smooth animations

### Admin Dashboard
- 🔐 **Secure admin login** with bcrypt-hashed passwords
- ⏰ **30-minute inactivity auto-logout** with session-expired modal
- 📊 **Dashboard analytics** — total/today orders, revenue, 7-day sales chart, best sellers, category pie chart
- 🛒 **Order management** — accept/reject/mark delivered, view/print invoice
- 📦 **Product CRUD** — add/edit/delete, multi-image upload, price/MRP/stock, active toggle
- 🏷️ **Category management** — add/edit/delete
- 🎁 **Offer popup editor** with live preview
- 📢 **Announcement bar editor** with live preview

### Real-Time Features
- 🔔 **Instant order notifications** — popup with order ID, customer name, total, time, and View Order button
- 🔊 **Notification sound** (Web Audio API — no external file)
- 🔢 **Live badge counter** in admin header
- ⚡ **Orders page auto-updates** when new orders arrive (no refresh needed)
- 📈 **Dashboard stats auto-refresh** (debounced)

### Image Upload
- 🗜️ **Automatic image compression** on every upload (sharp)
  - Max dimension capped at 1200px (preserves aspect ratio)
  - JPEG quality 80, PNG quality 85, WebP quality 80
  - Phone photo EXIF orientation auto-corrected
  - 80–95% file size reduction on average
  - 25MB upload limit (handles large phone photos)

### WhatsApp Notification Scaffold
- Code structured for easy WhatsApp Business API integration
- Currently logs formatted order messages to server console
- To enable real WhatsApp: set `WHATSAPP_API_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID` env vars and fill in `sendViaWhatsAppBusinessAPI` in `src/lib/notifications/whatsapp.ts`

---

## 🎨 Design

- **Brand colors:** Green (`#1a7a3c`) + Orange (`#ff7a1a`)
- **Mobile-first responsive** — works on phone, tablet, desktop
- **Premium supermarket theme** with modern animations
- **Sticky header & footer** with smooth hover effects
- **SEO-optimized** with OpenGraph, Twitter cards, and PWA manifest

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | Prisma ORM (SQLite for dev, MySQL-compatible schema) |
| State | Zustand (cart, nav, admin) |
| Real-time | Socket.IO (mini-service on port 3003) |
| Auth | bcrypt + httpOnly session cookies |
| Images | sharp (compression) |
| Charts | Recharts |
| Icons | Lucide React |

---

## 📦 Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/                  # REST API routes
│   │   │   ├── products/         # GET, POST, [id] PUT/DELETE
│   │   │   ├── categories/       # GET, POST, [id] PUT/DELETE
│   │   │   ├── orders/           # GET, POST (Rajula-only), [id] PUT
│   │   │   ├── settings/[key]/   # GET, PUT
│   │   │   ├── admin/login/      # POST (bcrypt verify)
│   │   │   ├── admin/verify/     # POST, DELETE (sliding session)
│   │   │   ├── analytics/        # GET (dashboard stats)
│   │   │   └── upload/           # POST (image compression), GET (stats)
│   │   ├── layout.tsx            # SEO metadata, PWA manifest
│   │   ├── page.tsx              # Main entry (view routing)
│   │   └── globals.css           # Brand theme + animations
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   └── mehta/                # App-specific components
│   │       ├── admin/            # Admin dashboard sub-components
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       ├── Hero.tsx
│   │       ├── ProductCard.tsx
│   │       ├── CartDrawer.tsx
│   │       ├── CheckoutPage.tsx
│   │       ├── OfferPopup.tsx
│   │       └── ...
│   └── lib/
│       ├── auth.ts               # bcrypt + session tokens
│       ├── api-auth.ts           # requireAdmin guard
│       ├── db.ts                 # Prisma client
│       ├── sound.ts              # Web Audio notification sound
│       ├── use-admin-socket.ts   # WebSocket hook
│       ├── use-inactivity-logout.ts
│       ├── stores/               # Zustand stores
│       ├── notifications/whatsapp.ts
│       └── types.ts
├── prisma/
│   └── schema.prisma             # Admin, Category, Product, Order, OrderItem, Setting
├── mini-services/
│   └── order-notifications/      # Socket.IO service on port 3003
├── public/
│   ├── manifest.json             # PWA manifest
│   ├── icons/                    # 192px + 512px PWA icons
│   └── uploads/                  # (gitignored — runtime images)
└── next.config.ts
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+ (or Bun)
- SQLite (bundled — no install needed)

### Setup
```bash
# Install dependencies
bun install   # or npm install

# Set up the database
bun run db:push

# (Optional) Seed sample data — 40 products across 7 categories
bun run scripts/seed.ts

# Start the dev server
bun run dev    # http://localhost:3000

# In a separate terminal, start the WebSocket mini-service for real-time notifications
cd mini-services/order-notifications
bun install
bun run dev    # port 3003
```

### Admin Access
The admin dashboard is accessible via the "Admin Login" link in the footer. After deploying, **change the admin password immediately** by updating it in the database (the password is bcrypt-hashed).

---

## ☁️ Deployment (Vercel)

### Environment Variables
Set these in your Vercel project settings:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | `file:./db/custom.db` for SQLite, or a MySQL connection string |
| `WHATSAPP_API_TOKEN` | optional | For real WhatsApp notifications (currently stubbed) |
| `WHATSAPP_PHONE_NUMBER_ID` | optional | For real WhatsApp notifications |
| `BROADCAST_SECRET` | optional | Shared secret for the WebSocket /broadcast endpoint |

### Important Notes for Vercel
1. **Database:** SQLite is fine for development. For production on Vercel, switch to a managed database (PlanetScale MySQL, Neon Postgres, or Turso) by updating `prisma/schema.prisma` `datasource` provider and the `DATABASE_URL` env var.

2. **Uploaded images:** Vercel's filesystem is ephemeral. For production, replace the local `/api/upload` route with cloud storage (Cloudinary, S3, Vercel Blob, etc.).

3. **WebSocket mini-service:** Vercel doesn't run long-lived WebSocket servers. For production real-time notifications, deploy the `mini-services/order-notifications` service separately (Render, Railway, Fly.io) and update `XTransformPort=3003` in `src/lib/use-admin-socket.ts` to point to your WebSocket URL.

---

## 📜 License

© 2026 Mehta Super Market, Rajula. All rights reserved.

---

## 📞 Contact

**Mehta Super Market**
📍 Main Bazar, Rajula, Amreli, Gujarat 365560
🕐 Open Daily 7:00 AM – 10:00 PM
🚚 Home delivery in Rajula city only (free on orders above ₹500)
