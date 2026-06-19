'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Ticket, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minOrderValue: number
  maxUsage: number
  usageCount: number
  expiryDate: string | null
  isActive: boolean
  createdAt: string
}

export function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: Coupon | null }>({ open: false, editing: null })

  const load = () => {
    setLoading(true)
    fetch('/api/coupons')
      .then((r) => r.json())
      .then((d) => setCoupons(d.coupons || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Delete coupon "${c.code}"? This cannot be undone.`)) return
    try {
      await fetch(`/api/coupons/${c.id}`, { method: 'DELETE' })
      toast.success('Coupon deleted')
      load()
    } catch {
      toast.error('Failed to delete coupon')
    }
  }

  const toggleActive = async (c: Coupon) => {
    try {
      await fetch(`/api/coupons/${c.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !c.isActive }),
      })
      toast.success(`Coupon ${!c.isActive ? 'enabled' : 'disabled'}`)
      load()
    } catch {
      toast.error('Failed to update coupon')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Coupons</h1>
          <p className="text-sm text-muted-foreground">{coupons.length} coupon{coupons.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })} className="bg-brand-green hover:bg-brand-green-dark text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Coupon
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : coupons.length === 0 ? (
        <Card className="p-10 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold mb-1">No coupons yet</p>
          <p className="text-sm text-muted-foreground">Create coupon codes for customers to use at checkout</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {coupons.map((c) => (
            <Card key={c.id} className={`p-4 ${!c.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-brand-green">{c.code}</span>
                    <Badge variant="outline" className={c.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}>
                      {c.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setModal({ open: true, editing: c })}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDelete(c)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold">
                    {c.discountType === 'FIXED' ? `₹${c.discountValue.toFixed(0)} off` : `${c.discountValue}% off`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Min Order</span>
                  <span className="font-semibold">₹{c.minOrderValue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Usage</span>
                  <span className="font-semibold">
                    {c.usageCount}{c.maxUsage > 0 ? ` / ${c.maxUsage}` : ' (unlimited)'}
                  </span>
                </div>
                {c.expiryDate && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span className="font-semibold">{new Date(c.expiryDate).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">{c.isActive ? 'Enabled' : 'Disabled'}</span>
                <Switch checked={c.isActive} onCheckedChange={() => toggleActive(c)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal.open && (
        <CouponModal
          coupon={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}

function CouponModal({ coupon, onClose, onSaved }: { coupon: Coupon | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: coupon?.code || '',
    description: coupon?.description || '',
    discountType: coupon?.discountType || 'FIXED',
    discountValue: coupon?.discountValue?.toString() || '',
    minOrderValue: coupon?.minOrderValue?.toString() || '0',
    maxUsage: coupon?.maxUsage?.toString() || '0',
    expiryDate: coupon?.expiryDate ? new Date(coupon.expiryDate).toISOString().slice(0, 10) : '',
    isActive: coupon?.isActive ?? true,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.code || !form.discountValue) return toast.error('Code and discount value are required')
    setSaving(true)
    try {
      const url = coupon ? `/api/coupons/${coupon.id}` : '/api/coupons'
      const method = coupon ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      toast.success(coupon ? 'Coupon updated' : 'Coupon created')
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{coupon ? 'Edit Coupon' : 'Add New Coupon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Coupon Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="SAVE50"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount Type *</Label>
              <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="50% off on all orders" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Discount Value *</Label>
              <Input type="number" step="0.01" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} placeholder={form.discountType === 'FIXED' ? '50' : '10'} />
              <p className="text-xs text-muted-foreground">{form.discountType === 'FIXED' ? '₹ amount to subtract' : '% of subtotal (0-100)'}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Min Order Value</Label>
              <Input type="number" step="0.01" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} placeholder="500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Max Usage (0 = unlimited)</Label>
              <Input type="number" value={form.maxUsage} onChange={(e) => setForm({ ...form, maxUsage: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="font-semibold">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive coupons can&apos;t be used at checkout</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>

          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={saving} className="bg-brand-green hover:bg-brand-green-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : coupon ? 'Update' : 'Create'} Coupon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
