import { ENV } from '@/lib/constants/env'
import { logger } from '@/lib/analytics'
import { analytics } from '@/lib/analytics/posthog'
import { captureError } from '@/lib/analytics'

// detection helpers

export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false
  // ipad pro running ipados reports as macintosh in useragent but has touch points
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )
}

export function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}

export function getPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default'
  }
  return Notification.permission
}

// permission request

export async function requestPermission(): Promise<NotificationPermission> {
  const result = await Notification.requestPermission()
  logger.info({ result }, 'Push notification permission result')
  analytics.pushPermissionRequested(result)
  return result
}

// vapid key helper (not exported)

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// subscribe

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) {
    logger.info('Push notifications not supported in this browser')
    return false
  }

  try {
    // Serwist sets `disable: true` when NODE_ENV === 'development', so no SW is ever
    // registered in dev. navigator.serviceWorker.ready would hang forever in that case.
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Push notifications are disabled in development mode (no service worker)')
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(ENV.vapid.publicKey) as unknown as ArrayBuffer,
    })

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subscription.toJSON(), userId }),
    })

    if (!res.ok) {
      logger.error({ status: res.status, userId }, 'Push subscribe API call failed')
      return false
    }

    logger.info({ userId }, 'Push subscription activated')
    analytics.pushNotificationEnabled()
    return true
  } catch (err) {
    logger.error({ err }, 'Failed to subscribe to push notifications')
    captureError(err as Error)
    return false
  }
}

// unsubscribe

export async function unsubscribeFromPush(userId: string): Promise<void> {
  if (!isPushSupported()) return

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }

    await fetch('/api/push/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    logger.info({ userId }, 'Push subscription removed')
    analytics.pushNotificationDisabled()
  } catch (err) {
    logger.error({ err }, 'Failed to unsubscribe from push notifications')
    captureError(err as Error)
  }
}
