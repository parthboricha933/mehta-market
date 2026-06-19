'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Save, Plus, Trash2, Bell, Eye } from 'lucide-react'
import { toast } from 'sonner'

export function AdminAnnouncements() {
  const [messages, setMessages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newMsg, setNewMsg] = useState('')
  const [preview, setPreview] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/settings/announcements')
      .then((r) => r.json())
      .then((d) => setMessages(d.value || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: messages.filter((m) => m.trim()) }),
      })
      toast.success('Announcements updated')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const addMsg = () => {
    if (!newMsg.trim()) return
    setMessages([...messages, newMsg.trim()])
    setNewMsg('')
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-12 w-48" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Announcement Bar</h1>
          <p className="text-sm text-muted-foreground">Edit scrolling top announcement messages</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setPreview(!preview)}>
            <Eye className="h-4 w-4 mr-1" /> {preview ? 'Hide Preview' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-green hover:bg-brand-green-dark text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
          </Button>
        </div>
      </div>

      {preview && (
        <div className="marquee-container relative bg-gradient-to-r from-brand-green via-brand-green-light to-brand-green text-white py-2.5 overflow-hidden text-sm font-medium rounded-lg">
          <div className="flex items-center">
            <div className="hidden sm:flex items-center gap-1.5 bg-brand-orange px-3 py-1 rounded-full ml-3 mr-3 flex-shrink-0 font-bold shadow-md">
              <Bell className="h-3.5 w-3.5" /><span className="text-xs">Announcement</span>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="animate-marquee">
                {[...messages, ...messages].map((m, i) => (
                  <span key={i} className="mx-8 inline-flex items-center gap-2">
                    <span className="text-brand-orange-light">★</span>{m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div>
          <Label className="font-semibold">Announcement Messages ({messages.length})</Label>
          <p className="text-xs text-muted-foreground">These will scroll across the top of the website</p>
        </div>

        <div className="flex gap-2">
          <Input
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMsg() } }}
            placeholder="Type a new announcement..."
          />
          <Button onClick={addMsg} className="bg-brand-orange hover:bg-brand-orange-dark text-white">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No announcements yet. Add one above.
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className="flex items-center gap-2 p-3 rounded-lg border bg-white hover:shadow-sm">
                <div className="h-7 w-7 rounded-full bg-brand-green/10 text-brand-green grid place-items-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <Input
                  value={m}
                  onChange={(e) => setMessages(messages.map((mm, idx) => idx === i ? e.target.value : mm))}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0 text-red-600"
                  onClick={() => setMessages(messages.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
