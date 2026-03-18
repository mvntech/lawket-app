'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { posthog, initPostHog, capturePageview } from './posthog'

function PageviewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname) capturePageview(window.location.href)
  }, [pathname])

  return null
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <PHProvider client={posthog}>
      <PageviewTracker />
      {children}
    </PHProvider>
  )
}
