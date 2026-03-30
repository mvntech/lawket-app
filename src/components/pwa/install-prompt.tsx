'use client'

import { useState, useEffect } from 'react'
import { Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// constants

const DISMISSED_KEY = 'lawket-install-prompt-dismissed'
const LAST_SHOWN_KEY = 'lawket-install-prompt-last-shown'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

function isDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === 'true'
  } catch {
    return false
  }
}

function isWithin7Days(): boolean {
  try {
    const lastShown = localStorage.getItem(LAST_SHOWN_KEY)
    if (!lastShown) return false
    return Date.now() - parseInt(lastShown, 10) < SEVEN_DAYS_MS
  } catch {
    return false
  }
}

function markShown(): void {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, Date.now().toString())
  } catch {
    // localStorage unavailable
  }
}

function dismiss(): void {
  try {
    localStorage.setItem(DISMISSED_KEY, 'true')
  } catch {
    // localStorage unavailable
  }
}

// types

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// component

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // already installed as PWA (render nothing)
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const handler = (e: Event) => {
      // re-verify dismissal state inside the handler to be reactive to session changes
      if (isDismissed() || isWithin7Days()) return

      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setOpen(true)
      // markShown is only called when we actually display the dialog
      markShown()
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        dismiss()
      }
    } catch {
      // handle potential context loss
    } finally {
      setOpen(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    dismiss()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss() }}>
      <DialogContent className="sm:max-w-sm rounded-3xl p-6 border-none shadow-2xl bg-white dark:bg-zinc-900 overflow-hidden">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-transform hover:scale-105 duration-300">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl text-center font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Install Lawket app
          </DialogTitle>
          <DialogDescription className="text-base text-center text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
            Get the native app experience with offline support and faster access to your case files.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-8 space-y-4">
          {[
            { text: "Works offline in courtrooms", icon: "✓" },
            { text: "Hearing and deadline reminders", icon: "✓" },
            { text: "Instant access from home screen", icon: "✓" },
          ].map((feature) => (
            <div key={feature.text} className="flex items-center gap-4 group">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <span className="text-xs font-bold">{feature.icon}</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                {feature.text}
              </span>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-10 flex flex-col gap-3 sm:flex-col items-stretch">
          <Button
            className="w-full py-6 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-[0.98]"
            onClick={handleInstall}
          >
            Install now
          </Button>
          <Button
            variant="ghost"
            className="w-full py-6 rounded-2xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            onClick={handleDismiss}
          >
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
