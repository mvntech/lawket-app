'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, Smartphone, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/use-push-notifications'

// constants

const DISMISSED_KEY = 'lawket-push-prompt-dismissed'
const LAST_SHOWN_KEY = 'lawket-push-prompt-last-shown'
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

// component

interface PushPermissionPromptProps {
  userId: string
}

export function PushPermissionPrompt({ userId }: PushPermissionPromptProps) {
  const pathname = usePathname()
  const { isSupported, isIOS, isStandalone, permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications(userId)

  // track in-session dismissal without setState-in-effect
  const [dismissedInSession, setDismissedInSession] = useState(false)

  // mark prompt as shown in localStorage (pure side effect, no setState)
  useEffect(() => {
    if (isSupported && permission === 'default' && !isDismissed()) {
      markShown()
    }
  }, [isSupported, permission])

  const handleDismiss = () => {
    dismiss()
    setDismissedInSession(true)
  }

  const handleEnable = async () => {
    await subscribe()
    setDismissedInSession(true)
  }

  // state 1: not supported (render nothing)
  if (!isSupported) return null

  // state 4: already subscribed (render nothing)
  if (isSubscribed) return null

  // state 2: iOS, not installed as PWA
  if (isIOS && !isStandalone) {
    if (dismissedInSession) return null
    return (
      <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3">
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Enable hearing reminders</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Add Lawket to your home screen to receive push notifications.{' '}
            Tap <strong>Share</strong> → <strong>Add to Home Screen.</strong>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // state 5: denied (shown only on settings/notifications page)
  if (permission === 'denied') {
    if (!pathname.includes('/settings/notifications')) return null
    return (
      <p className="text-sm text-muted-foreground">
        Notifications blocked. Enable in your browser settings to get hearing reminders.
      </p>
    )
  }

  // state 3: permission not yet requested, not dismissed, within 7-day window
  if (permission === 'default' && !dismissedInSession && !isDismissed() && !isWithin7Days()) {
    return (
      <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Never miss a hearing</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enable notifications to get reminders before your hearings and deadlines.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleEnable} disabled={isLoading}>
              {isLoading ? 'Enabling…' : 'Enable notifications'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
