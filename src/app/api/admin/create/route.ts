import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'
import { hashPassword, MAX_ADMIN_ACCOUNTS } from '@/lib/auth'

// POST: Create a new admin account (requires existing admin auth).
// Enforces a hard limit of MAX_ADMIN_ACCOUNTS (2) — no more than 2 admins
// can exist in the system at any time.
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    const { username, password, name } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if username is already taken
    const existing = await db.admin.findFirst({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
    }

    // Enforce 2-admin limit
    const count = await db.admin.count()
    if (count >= MAX_ADMIN_ACCOUNTS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_ADMIN_ACCOUNTS} admin accounts allowed. Delete an existing admin first.` },
        { status: 403 }
      )
    }

    const hashed = await hashPassword(password)
    const admin = await db.admin.create({
      data: {
        username,
        passwordHash: hashed,
        name: name || username,
      },
      select: { id: true, username: true, name: true, createdAt: true },
    })

    return NextResponse.json({ success: true, admin })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET: List all admin accounts (requires existing admin auth)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  const admins = await db.admin.findMany({
    select: { id: true, username: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json({
    admins,
    count: admins.length,
    max: MAX_ADMIN_ACCOUNTS,
    canCreateMore: admins.length < MAX_ADMIN_ACCOUNTS,
  })
}

// DELETE: Delete an admin account (requires existing admin auth).
// Prevents deleting the last admin (must always have at least 1).
export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin(req)
  if (guard) return guard

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 })
    }

    const count = await db.admin.count()
    if (count <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin account' },
        { status: 403 }
      )
    }

    await db.admin.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
