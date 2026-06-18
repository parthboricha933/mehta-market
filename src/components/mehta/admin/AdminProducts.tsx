'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Search, Package, Loader2, X, Upload, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { Product, Category } from '@/lib/types'

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/products?activeOnly=false').then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
    ])
      .then(([p, c]) => {
        setProducts(p.products || [])
        setCategories(c.categories || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || p.category?.slug === filterCat
    return matchSearch && matchCat
  })

  const openAdd = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (p: Product) => {
    setEditing(p)
    setModalOpen(true)
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return
    try {
      await fetch(`/api/products/${p.id}`, { method: 'DELETE' })
      toast.success('Product deleted')
      load()
    } catch {
      toast.error('Failed to delete product')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} total products</p>
        </div>
        <Button onClick={openAdd} className="bg-brand-green hover:bg-brand-green-dark text-white">
          <Plus className="h-4 w-4 mr-1" /> Add Product
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="pl-10"
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <p className="font-semibold mb-1">No products found</p>
          <p className="text-sm text-muted-foreground">Add a new product or change filters</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-3 flex gap-3 hover:shadow-md transition">
              <img
                src={p.images?.[0] || 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=200&q=70'}
                alt={p.name}
                className="h-20 w-20 rounded-lg object-cover bg-muted flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{p.name}</h3>
                  {!p.isActive && <Badge variant="destructive" className="text-[9px]">Off</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{p.category?.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="font-bold text-brand-green">₹{p.price.toFixed(0)}</span>
                  {p.mrp && p.mrp > p.price && (
                    <span className="text-xs text-muted-foreground line-through">₹{p.mrp.toFixed(0)}</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">Stock: {p.stock} • Sold: {p.soldCount}</p>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(p)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProductModal
          product={editing}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load() }}
        />
      )}
    </div>
  )
}

function ProductModal({
  product, categories, onClose, onSaved,
}: {
  product: Product | null
  categories: Category[]
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price?.toString() || '',
    mrp: product?.mrp?.toString() || '',
    unit: product?.unit || '',
    categoryId: product?.categoryId || categories[0]?.id || '',
    stock: product?.stock?.toString() || '0',
    isActive: product?.isActive ?? true,
  })
  const [images, setImages] = useState<string[]>(product?.images || [])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    try {
      const fd = new FormData()
      Array.from(files).forEach((f) => fd.append('files', f))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.urls) setImages((prev) => [...prev, ...data.urls])
      toast.success(`${files.length} image(s) uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleUrlAdd = () => {
    const url = prompt('Enter image URL:')
    if (url) setImages((prev) => [...prev, url])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.categoryId) return toast.error('Name, price and category required')
    setSaving(true)
    try {
      const body = { ...form, price: parseFloat(form.price), mrp: form.mrp ? parseFloat(form.mrp) : null, stock: parseInt(form.stock) || 0, images }
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save')
      }
      toast.success(product ? 'Product updated' : 'Product added')
      onSaved()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Product Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fresh Bananas" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief product description" rows={2} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Price (₹) *</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="49" />
            </div>
            <div className="space-y-1.5">
              <Label>MRP (₹)</Label>
              <Input type="number" step="0.01" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="60" />
            </div>
            <div className="space-y-1.5">
              <Label>Stock</Label>
              <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="100" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="1 kg, 500 ml..." />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Product Images</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 h-5 w-5 grid place-items-center rounded-full bg-red-500 text-white text-[10px]"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="h-20 w-20 rounded-lg border-2 border-dashed border-border hover:border-brand-green grid place-items-center cursor-pointer text-muted-foreground hover:text-brand-green transition">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
              </label>
              <button
                type="button"
                onClick={handleUrlAdd}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-border hover:border-brand-orange grid place-items-center cursor-pointer text-muted-foreground hover:text-brand-orange transition"
              >
                <ImageIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Upload multiple images or paste image URL. First image will be primary.</p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <Label className="font-semibold">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive products won&apos;t show on shop</p>
            </div>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving} className="bg-brand-green hover:bg-brand-green-dark text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : product ? 'Update' : 'Add'} Product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
