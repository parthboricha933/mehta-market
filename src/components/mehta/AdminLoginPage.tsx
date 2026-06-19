'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Shield, Lock, User, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAdmin } from '@/lib/stores/admin'
import { useNav } from '@/lib/stores/nav'
import { toast } from 'sonner'

export function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const setAuth = useAdmin((s) => s.setAuth)
  const setView = useNav((s) => s.setView)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username || !password) return setError('Please enter username and password')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      setAuth(data.admin)
      setView('admin')
      toast.success('Welcome back, Admin!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-6 sm:p-8 shadow-xl">
        <button
          onClick={() => setView('home')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-brand-green to-brand-green-dark grid place-items-center text-white shadow-lg mb-3">
            <Shield className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Admin Login</h1>
          <p className="text-sm text-muted-foreground">Mehta Super Market - Admin Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-user">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="pl-10"
                autoComplete="username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-pwd">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="admin-pwd"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="pl-10 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold py-3"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Login'}
          </Button>
        </form>

        <div className="mt-5 text-center text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
          <p className="font-semibold mb-1">Demo Credentials</p>
          <p>Username: <code className="font-mono bg-white px-1 rounded">admin</code> &nbsp; Password: <code className="font-mono bg-white px-1 rounded">mehta123</code></p>
        </div>
      </Card>
    </div>
  )
}
