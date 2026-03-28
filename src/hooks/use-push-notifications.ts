'use client'

import { useState, useEffect } from 'react'
import {
  isPushSupported,
  isIOS,
  isInStandaloneMode,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/push-client'
import { logger } from '@/lib/analytics'

// types

interface PushNotificationState {
  isSupported: boolean
  isIOS: boolean
  isStandalone: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

// hook

export function usePushNotifications(userId: string | undefined) {
  // initialize synchronously from browser APIs (safe in client component)
  const [state, setState] = useState<PushNotificationState>(() => ({
    isSupported: isPushSupported(),
    isIOS: isIOS(),
    isStandalone: isInStandaloneMode(),
    permission: getPermissionStatus(),
    isSubscribed: false,
    isLoading: false,
    error: null,
  }))

  // async-only effect: check existing subscription status on mount.
  // isSupported comes from static browser API checks - it never changes, so the empty dep array is correct.
  useEffect(() => {
    if (!state.isSupported) return

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState((prev) => ({ ...prev, isSubscribed: !!sub })))
      .catch((err) => logger.warn({ err }, 'Could not check push subscription status'))
  }, [])

  async function subscribe(): Promise<void> {
    if (!userId) {
      logger.warn('subscribe() called without userId')
      return
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    let permission = getPermissionStatus()

    if (permission === 'default') {
      permission = await requestPermission()
    }

    if (permission === 'denied') {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        permission: 'denied',
        error: 'Notifications blocked. Enable in browser settings.',
      }))
      return
    }

    if (state.isIOS && !state.isStandalone) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Add Lawket to your home screen to enable notifications.',
      }))
      return
    }

    const success = await subscribeToPush(userId)
    setState((prev) => ({
      ...prev,
      isSubscribed: success,
      isLoading: false,
      permission: getPermissionStatus(),
      error: success
        ? null
        : 'Could not register for push notifications. In development, run a production build first (pnpm build && pnpm start).',
    }))
  }

  async function unsubscribe(): Promise<void> {
    if (!userId) return
    setState((prev) => ({ ...prev, isLoading: true, error: null }))
    await unsubscribeFromPush(userId)
    setState((prev) => ({ ...prev, isSubscribed: false, isLoading: false }))
  }

  return { ...state, subscribe, unsubscribe }
}
