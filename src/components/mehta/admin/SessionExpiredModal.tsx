'use client'

import { useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Clock, LogIn, AlertTriangle } from 'lucide-react'
import { useAdmin } from '@/lib/stores/admin'
import { useNav } from '@/lib/stores/nav'

export function SessionExpiredModal() {
  const { sessionExpired, sessionExpiryReason, clearSessionExpired } = useAdmin()
  const setView = useNav((s) => s.setView)

  // When session is marked expired, navigate to login page (which preserves the expired flag)
  useEffect(() => {
    if (sessionExpired) {
      setView('admin-login')
    }
  }, [sessionExpired, setView])

  const handleClose = () => {
    clearSessionExpired()
  }

  const reasonText =
    sessionExpiryReason === 'max_lifetime'
      ? 'Your session has expired because it reached the maximum allowed duration (7 days). Please log in again to continue.'
      : 'You have been automatically logged out after 30 minutes of inactivity. Please log in again to continue.'

  return (
    <Dialog open={sessionExpired} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden [&>button]:hidden">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-white/20 grid place-items-center mb-3">
            <Clock className="h-8 w-8" />
          </div>
          <DialogTitle className="text-xl font-extrabold text-white">
            Session Expired
          </DialogTitle>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-900 leading-relaxed">{reasonText}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            For your security, admin sessions automatically end after 30 minutes of inactivity.
          </p>
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button
            onClick={handleClose}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold py-3"
          >
            <LogIn className="h-4 w-4 mr-2" /> Go to Login
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
