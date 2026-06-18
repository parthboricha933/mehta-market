import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl(): string {
  // On Vercel (and other serverless platforms), the project filesystem is READ-ONLY
  // except for the /tmp directory. SQLite needs a writable location, so we redirect
  // the database file to /tmp when running on Vercel.
  //
  // Note: This means the database is EPHEMERAL on Vercel — it gets recreated on
  // each cold start. The auto-seed.ts helper repopulates it with default data
  // (admin, categories, sample products, settings) on first API call after a
  // cold start. For production use, switch to a persistent database like
  // Turso, PlanetScale, or Neon by setting DATABASE_URL in your Vercel project.
  const configured = process.env.DATABASE_URL
  if (configured && !configured.startsWith('file:')) {
    // Non-file URL (e.g. mysql://, postgres://, libsql://) — use as-is
    return configured
  }

  // Check if we're on Vercel
  const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV
  if (isVercel) {
    // Use /tmp — the only writable directory on Vercel serverless functions
    return 'file:/tmp/mehta-market.db'
  }

  // Local dev — use the configured file path
  return configured || 'file:./db/custom.db'
}

function createPrismaClient(): PrismaClient {
  const dbUrl = getDatabaseUrl()

  // Ensure the db directory exists (only relevant for local dev; /tmp always exists on Vercel)
  if (dbUrl.startsWith('file:./') || dbUrl.startsWith('file:' + process.cwd())) {
    try {
      const dbDir = path.join(process.cwd(), 'db')
      if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
    } catch {}
  }

  return new PrismaClient({
    log: process.env.NODE_ENV !== 'production' ? ['query'] : ['error'],
    datasources: {
      db: { url: dbUrl },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
