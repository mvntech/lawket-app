'use client'

import { Bell, AlertTriangle, Smartphone, Info } from 'lucide-react'
import { PageHeader } from '@/components/shared/page-header'
import { Switch } from '@/components/ui/switch'
import { PushPermissionPrompt } from '@/components/notifications/push-permission-prompt'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useAuth } from '@/hooks/use-auth'
import { ENV } from '@/lib/constants/env'
import { ROUTES } from '@/lib/constants/routes'

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const userId = user?.id ?? ''

  const {
    isSupported,
    isIOS,
    isStandalone,
    permission,
    isSubscribed,
    isLoading,
    error: pushError,
    subscribe,
    unsubscribe,
  } = usePushNotifications(userId)

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe()
    } else {
      await unsubscribe()
    }
  }

  const sendTestNotification = async () => {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification('Test - Lawket', {
      body: 'Notifications are working!',
      icon: '/icons/icon-192.png',
    })
  }

  return (
    <>
      <PageHeader title="Notifications" backHref={ROUTES.settings.root} />

      <div className="p-4 md:px-6 space-y-6 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-foreground">Push notifications</h2>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Hearing reminders</p>
                    <p className="text-xs text-muted-foreground">
                      {isSubscribed
                        ? 'Enabled - you will receive reminders before hearings and deadlines.'
                        : 'Disabled - enable to receive reminders.'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isSubscribed}
                  onCheckedChange={handleToggle}
                  disabled={isLoading || !isSupported}
                  aria-label="Toggle push notifications"
                />
              </div>

              {isIOS && !isStandalone && (
                <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Add to home screen required</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      To receive push notifications on iOS, install Lawket as a PWA.
                      Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then reopen the app.
                    </p>
                  </div>
                </div>
              )}

              {pushError && permission !== 'denied' && (
                <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <p className="text-xs text-muted-foreground">{pushError}</p>
                </div>
              )}

              {permission === 'denied' && (
                <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Notifications are blocked</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Open your browser settings, find Lawket under Site Settings, and set
                      Notifications to &quot;Allow&quot;.
                    </p>
                  </div>
                </div>
              )}

              {!isSupported && (
                <p className="text-xs text-muted-foreground">
                  Push notifications are not supported in this browser.
                </p>
              )}

              {permission === 'denied' && (
                <PushPermissionPrompt userId={userId} />
              )}
            </div>
          </div>

          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-foreground">Reminder timing</h2>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm text-foreground">Hearing reminders: 24 hours before</p>
                  <p className="text-sm text-foreground">Deadline reminders: 24 hours before</p>
                  <p className="text-xs text-muted-foreground mt-1">Reminder times are set automatically.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {ENV.app.isDev && (
          <div className="rounded-lg border bg-card">
            <div className="px-4 py-3 border-b">
              <h2 className="text-sm font-semibold text-foreground">Test notification</h2>
            </div>
            <div className="p-4">
              <button
                onClick={sendTestNotification}
                className="text-sm text-primary underline underline-offset-2 hover:no-underline"
              >
                Send test notification
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
