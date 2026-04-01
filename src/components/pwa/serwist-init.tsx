'use client'

import { useEffect } from 'react'

/**
 * Explicitly registers /sw.js on mount.
 *
 * @serwist/next's webpack auto-inject is unreliable in some build configurations.
 * Calling register() again when the SW is already registered is a no-op — the
 * browser returns the existing registration — so this is always safe to include.
 *
 * Must be a client component (useEffect) rendered inside the root layout.
 */
export function SerwistInit() {
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      process.env.NODE_ENV === 'development'
    ) {
      return
    }

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => {
        // Non-fatal — app works online without SW, just no offline / push
        console.warn('[SW] Registration failed:', err)
      })
  }, [])

  return null
}
