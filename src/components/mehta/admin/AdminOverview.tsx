'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  TrendingUp, IndianRupee, Clock, CheckCircle2, Package, ShoppingBag, Award, Activity
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useAdmin } from '@/lib/stores/admin'

interface Analytics {
  totalOrders: number
  todayOrders: number
  revenue: number
  todayRevenue: number
  pendingOrders: number
  deliveredOrders: number
  bestSelling: any[]
  salesByDay: { date: string; label: string; orders: number; revenue: number }[]
  categoryStats: { name: string; slug: string; count: number }[]
}

const PIE_COLORS = ['#1a7a3c', '#ff7a1a', '#2ea553', '#ffa050', '#d65f00', '#4abd6d', '#ffcc80']

export function AdminOverview() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  // Subscribe to real-time new-order events so the dashboard stats
  // (total orders, today's orders, revenue, pending count, 7-day chart, best
  // sellers) refresh automatically without a page reload.
  const lastNewOrderSeq = useAdmin((s) => s.lastNewOrderSeq)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchAnalytics = () => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  // Initial load
  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Re-fetch analytics when a new-order event arrives. Debounced to 800ms so
  // a burst of orders doesn't trigger N parallel API calls.
  useEffect(() => {
    if (lastNewOrderSeq === 0) return // skip initial
    console.log('[overview] 📊 Real-time event received, refreshing analytics (seq:', lastNewOrderSeq, ')')
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      console.log('[overview] Fetching fresh analytics...')
      fetchAnalytics()
    }, 800)
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [lastNewOrderSeq])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (!data) return <div className="text-center text-muted-foreground py-10">Failed to load analytics</div>

  const stats = [
    { label: 'Total Orders', value: data.totalOrders, sub: `${data.todayOrders} today`, icon: ShoppingBag, color: 'from-brand-green to-brand-green-dark' },
    { label: 'Total Revenue', value: `₹${data.revenue.toFixed(0)}`, sub: `₹${data.todayRevenue.toFixed(0)} today`, icon: IndianRupee, color: 'from-brand-orange to-brand-orange-dark' },
    { label: 'Pending Orders', value: data.pendingOrders, sub: 'Need action', icon: Clock, color: 'from-amber-500 to-amber-700' },
    { label: 'Delivered', value: data.deliveredOrders, sub: 'Completed', icon: CheckCircle2, color: 'from-emerald-500 to-emerald-700' },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-foreground">Dashboard Overview</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {stats.map((s, i) => (
          <Card key={i} className={`p-3 sm:p-4 text-white bg-gradient-to-br ${s.color} shadow-md overflow-hidden`}>
            <div className="flex items-start justify-between mb-2">
              <div className="text-[10px] sm:text-xs font-semibold text-white/85 uppercase tracking-wide">{s.label}</div>
              <s.icon className="h-4 w-4 sm:h-5 sm:w-5 text-white/70 flex-shrink-0" />
            </div>
            <div className="text-lg sm:text-2xl font-extrabold">{s.value}</div>
            <div className="text-[10px] sm:text-xs text-white/80 mt-1">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Sales last 7 days */}
      <Card className="p-3 sm:p-5 overflow-hidden">
        <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-green" /> Sales - Last 7 Days
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Daily revenue trend</p>
        <div className="h-56 sm:h-64 w-full overflow-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.salesByDay} margin={{ left: -20, right: 5, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e3e8e4" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e3e8e4', fontSize: 12 }}
                formatter={(v: number) => [`₹${v.toFixed(0)}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#1a7a3c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Best selling */}
        <Card className="p-3 sm:p-5 overflow-hidden">
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <Award className="h-5 w-5 text-brand-orange" /> Best Selling Products
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Top 5 by units sold</p>
          <div className="space-y-3">
            {data.bestSelling.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No sales yet</p>
            ) : (
              data.bestSelling.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-extrabold text-white flex-shrink-0 ${
                    i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-muted-foreground'
                  }`}>{i + 1}</div>
                  <img
                    src={p.images?.[0] || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=80&q=70'}
                    alt={p.name}
                    className="h-10 w-10 rounded-md object-cover bg-muted flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.category || 'Uncategorized'} • ₹{p.price.toFixed(0)}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-brand-green">{p.soldCount}</div>
                    <div className="text-[10px] text-muted-foreground">sold</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Category distribution */}
        <Card className="p-3 sm:p-5 overflow-hidden">
          <h2 className="font-bold text-foreground mb-1 flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-green" /> Products by Category
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Inventory distribution</p>
          <div className="h-56 w-full overflow-hidden">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.categoryStats}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  label={(e: any) => e.name}
                  labelLine={false}
                >
                  {data.categoryStats.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}
