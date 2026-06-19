'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Save, Eye, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import type { OfferPopup } from '@/lib/types'

export function AdminPopup() {
  const [popup, setPopup] = useState<OfferPopup | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/settings/offer_popup')
      .then((r) => r.json())
      .then((d) => setPopup(d.value || { enabled: true, title: '', description: '', image: '', ctaText: 'Shop Now' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings/offer_popup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: popup }),
      })
      toast.success('Popup updated')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (files: FileList | null) => {
    if (!files?.[0]) return
    const fd = new FormData()
    fd.append('files', files[0])
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.urls?.[0]) setPopup({ ...popup!, image: data.urls[0] })
      toast.success('Image uploaded')
    } catch {
      toast.error('Upload failed')
    }
  }

  if (loading || !popup) {
    return <div className="space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-96 rounded-xl" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Offer Popup</h1>
          <p className="text-sm text-muted-foreground">Edit the popup that appears on website open</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(true)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-green hover:bg-brand-green-dark text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-semibold">Enable Offer Popup</Label>
            <p className="text-xs text-muted-foreground">Show popup when website opens (once per session)</p>
          </div>
          <Switch checked={popup.enabled} onCheckedChange={(v) => setPopup({ ...popup, enabled: v })} />
        </div>

        <div className="space-y-1.5">
          <Label>Popup Title</Label>
          <Input value={popup.title} onChange={(e) => setPopup({ ...popup, title: e.target.value })} placeholder="e.g. Mega Sale - 40% OFF!" />
        </div>

        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea value={popup.description} onChange={(e) => setPopup({ ...popup, description: e.target.value })} placeholder="Offer details shown in popup" rows={4} />
        </div>

        <div className="space-y-1.5">
          <Label>CTA Button Text</Label>
          <Input value={popup.ctaText} onChange={(e) => setPopup({ ...popup, ctaText: e.target.value })} placeholder="Shop Now" />
        </div>

        <div className="space-y-2">
          <Label>Popup Banner Image</Label>
          <div className="flex gap-3 flex-wrap">
            {popup.image && (
              <div className="relative h-28 w-full max-w-xs rounded-lg overflow-hidden border border-border">
                <img src={popup.image} alt="Popup banner" className="h-full w-full object-cover" />
                <button
                  onClick={() => setPopup({ ...popup, image: '' })}
                  className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-full bg-red-500 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <label className="h-28 flex-1 max-w-xs rounded-lg border-2 border-dashed border-border hover:border-brand-green grid place-items-center cursor-pointer text-muted-foreground hover:text-brand-green transition text-sm">
              <div className="text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-1" />
                <span>Upload image</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </label>
          </div>
          <Input
            value={popup.image}
            onChange={(e) => setPopup({ ...popup, image: e.target.value })}
            placeholder="Or paste image URL here"
            className="mt-2"
          />
        </div>
      </Card>

      {/* Preview modal */}
      {preview && (
        <Dialog open onOpenChange={(o) => !o && setPreview(false)}>
          <DialogContent className="max-w-md p-0 overflow-hidden gap-0 [&>button]:hidden">
            <DialogClose asChild>
              <button className="absolute right-3 top-3 z-20 grid place-items-center h-9 w-9 rounded-full bg-black/40 text-white">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
            {popup.image && (
              <div className="relative h-44 bg-muted overflow-hidden">
                <img src={popup.image} alt={popup.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-green/80 via-brand-green/20 to-transparent" />
                <div className="absolute top-3 left-3 bg-brand-orange text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  <Sparkles className="h-3.5 w-3.5 inline mr-1" /> Limited Time
                </div>
              </div>
            )}
            <div className="p-6 bg-white">
              <div className="text-xs font-bold uppercase tracking-wider text-brand-orange mb-2">Special Offer</div>
              <h2 className="text-2xl font-extrabold text-brand-green mb-2">{popup.title || 'Offer Title'}</h2>
              <p className="text-sm text-muted-foreground mb-5">{popup.description || 'Offer description goes here...'}</p>
              <Button className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white font-bold py-3">
                {popup.ctaText || 'Shop Now'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
