'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Download, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useDeleteAccount, useSignOut } from '@/hooks/use-settings'
import { useAuth } from '@/hooks/use-auth'
import { ROUTES } from '@/lib/constants/routes'
import { analytics } from '@/lib/analytics/posthog'

export function AccountSettings() {
  const { user } = useAuth()
  const router = useRouter()
  const deleteAccount = useDeleteAccount()
  const signOut = useSignOut()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [confirmText, setConfirmText] = useState('')

  function handleExportData() {
    analytics.dataExported()
    // export as JSON of visible profile data (non-sensitive)
    const exportData = {
      exportedAt: new Date().toISOString(),
      note: 'Full case data export is available by contacting support.',
      email: user?.email,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lawket-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSignOut() {
    signOut.mutate(undefined, {
      onSuccess: () => {
        router.push(ROUTES.auth.login)
      },
    })
  }

  function handleDeleteAccount() {
    if (confirmText !== 'DELETE') return
    deleteAccount.mutate(undefined, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        router.push(ROUTES.auth.login)
      },
    })
  }

  function openDeleteDialog() {
    setDeleteStep(1)
    setConfirmText('')
    setShowDeleteDialog(true)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Export data</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download a copy of your account information.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export data
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Sign out</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sign out of your account on this device.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSignOut}
            disabled={signOut.isPending}
          >
            {signOut.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4 mr-2" />
            )}
            Sign out
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-destructive">Delete account</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={openDeleteDialog}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete account
        </Button>
      </div>

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) {
            setDeleteStep(1)
            setConfirmText('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete account
            </DialogTitle>
            <DialogDescription>
              {deleteStep === 1
                ? 'This will permanently delete your account, all cases, hearings, deadlines, documents, and contacts. This action cannot be undone.'
                : 'Type DELETE to confirm you want to permanently delete your account.'}
            </DialogDescription>
          </DialogHeader>

          {deleteStep === 2 && (
            <div className="py-2">
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                autoFocus
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            {deleteStep === 1 ? (
              <Button variant="destructive" onClick={() => setDeleteStep(2)}>
                Continue
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={confirmText !== 'DELETE' || deleteAccount.isPending}
              >
                {deleteAccount.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Delete account
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
