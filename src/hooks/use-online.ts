'use client'

import { useEffect, useState } from 'react'
import { useSyncStore } from '@/stores/sync.store'

export function useOnline(): boolean {
  const isOnline = useSyncStore((s) => s.isOnline)
  const setOnline = useSyncStore((s) => s.setOnline)

  useEffect(() => {
    // sync initial state
    setOnline(navigator.onLine)

    function handleOnline() {
      setOnline(true)
    }

    function handleOffline() {
      setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOnline])

  return isOnline
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isMobile
}
