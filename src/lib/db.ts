import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  // On Vercel (or any serverless platform), the working directory may not be writable.
  // Ensure the db directory exists relative to the project root.
  // DATABASE_URL is set in vercel.json / Vercel project env to: file:./db/custom.db
  try {
    const dbDir = path.join(process.cwd(), 'db')
    if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
  } catch {
    // Ignore — the directory may already exist or be on a read-only fs (rare for our case)
  }

  return new PrismaClient({
    // Silence query logs in production to reduce noise on Vercel
    log: process.env.NODE_ENV !== 'production' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
