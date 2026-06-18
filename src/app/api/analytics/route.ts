import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [totalOrders, todayOrders, allOrders, products, categories] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { createdAt: { gte: today } } }),
    db.order.findMany({ where: { status: { not: 'REJECTED' } }, include: { items: true } }),
    db.product.findMany({ orderBy: { soldCount: 'desc' }, take: 5, include: { category: true } }),
    db.category.findMany({ include: { _count: { select: { products: true } } } }),
  ])

  const revenue = allOrders.reduce((sum, o) => sum + o.total, 0)
  const todayRevenue = allOrders
    .filter((o) => o.createdAt >= today)
    .reduce((sum, o) => sum + o.total, 0)

  const pendingOrders = await db.order.count({ where: { status: 'PENDING' } })
  const deliveredOrders = await db.order.count({ where: { status: 'DELIVERED' } })

  // Best selling products by soldCount
  const bestSelling = products.map((p) => ({
    id: p.id,
    name: p.name,
    soldCount: p.soldCount,
    price: p.price,
    category: p.category?.name,
    images: JSON.parse(p.images || '[]'),
  }))

  // Sales last 7 days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentOrders = await db.order.findMany({
    where: { createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: 'asc' },
  })

  const salesByDay = []
  for (let i = 6; i >= 0; i--) {
    const day = new Date()
    day.setDate(day.getDate() - i)
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)
    const dayOrders = recentOrders.filter(
      (o) => o.createdAt >= day && o.createdAt < nextDay && o.status !== 'REJECTED'
    )
    salesByDay.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
    })
  }

  // Category distribution
  const categoryStats = categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    count: c._count.products,
  }))

  return NextResponse.json({
    totalOrders,
    todayOrders,
    revenue,
    todayRevenue,
    pendingOrders,
    deliveredOrders,
    bestSelling,
    salesByDay,
    categoryStats,
  })
}
