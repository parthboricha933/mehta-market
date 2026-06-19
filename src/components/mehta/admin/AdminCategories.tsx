'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Store, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Category } from '@/lib/types'

const ICON_OPTIONS = [
  'ShoppingBasket', 'Apple', 'Carrot', 'Milk', 'Cookie', 'CupSoda', 'Home'
]

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; editing: Category | null }>({ open: false, editing: null })

  const load = () => {
    setLoading(true)
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Products in this category will be orphaned.`)) return
    try {
      await fetch(`/api/categories/${c.id}`, { method: 'DELETE' })
      toast.success('Category deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Categories</h1>
          <p className="text-sm text-muted-foreground">{categories.length} categories</p>
        </div>
        <Button onClick={() => setModal({ open: true, editing: null })} className="bg-brand-green hover:bg-brand-green-dark text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((c) => (
            <Card key={c.id} className="p-4 flex items-center justify-between hover:shadow-md transition">
              <div>
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-muted-foreground">/{c.slug} • {c._count?.products || 0} products</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setModal({ open: true, editing: c })}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDelete(c)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modal.open && (
        <CategoryModal
          category={modal.editing}
          onClose={() => setModal({ open: false, editing: null })}
          onSaved={() => { setModal({ open: false, editing: null }); load() }}
        />
      )}
    </div>
  )
}

function CategoryModal({ category, onClose, onSaved }: { category: Category | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(category?.name || '')
  const [slug, setSlug] = useState(category?.slug || '')
  const [icon, setIcon] = useState(category?.icon || 'ShoppingBasket')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !slug) return toast.error('Name and slug required')
    setSaving(true)
    try {
      const url = category ? `/api/categories/${category.id}` : '/api/categories'
      const method = category ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/\s+/g, '-'), icon }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(category ? 'Category updated' : 'Category added')
      onSaved()
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => { setName(e.target.value); if (!category) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')) }} placeholder="e.g. Beverages" />
          </div>
          <div className="space-y-1.5">
            <Label>Slug (URL)</Label>
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="beverages" />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={saving} className="bg-brand-green hover:bg-brand-green-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : category ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
