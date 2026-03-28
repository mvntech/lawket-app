'use client'

import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { CaseStatsRow } from '@/components/dashboard/case-stats'
import { TodaysHearings } from '@/components/dashboard/todays-hearings'
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { OverdueAlert } from '@/components/dashboard/overdue-alert'
import { PushPermissionPrompt } from '@/components/notifications/push-permission-prompt'
import { useAuth } from '@/hooks/use-auth'
import { analytics, capturePageview } from '@/lib/analytics'
import { queryKeys } from '@/lib/constants/query-keys'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Bell, Plus } from 'lucide-react'
import { Theme } from '@fullcalendar/core/internal'

// helpers

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// component

export function DashboardClient() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    const mountedAt = Date.now()
    capturePageview('/dashboard')

    return () => {
      const seconds = Math.floor((Date.now() - mountedAt) / 1000)
      analytics.dashboardViewed(seconds)
    }
  }, [])

  // handle payment success redirect from lemonsqueezy
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    if (params.get('payment') === 'success') {
      const credits = params.get('credits')

      void queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })

      toast.success('Credits added!', {
        description: credits
          ? credits + ' AI credits are ready.'
          : 'Your credits are ready.',
        duration: 6000,
      })

      // clean URL without reload
      const url = new URL(window.location.href)
      url.searchParams.delete('payment')
      url.searchParams.delete('credits')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [queryClient])

  const fullName = user?.full_name ?? user?.email ?? ''
  const firstName = fullName.split(' ')[0] ?? 'there'

  const deadlinesSectionRef = useRef<HTMLDivElement>(null)
  const handleViewDeadlines = useCallback(() => {
    deadlinesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title={`${getGreeting()}, ${firstName}`}
        subtitle={formatDate()}
      />
      <div className="flex-1 space-y-4 p-4 md:px-6">

        <PushPermissionPrompt userId={user?.id ?? ''} />

        <OverdueAlert onView={handleViewDeadlines} />

        <CaseStatsRow />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <TodaysHearings />
            <div ref={deadlinesSectionRef}>
              <UpcomingDeadlines />
            </div>
          </div>
          <div className="space-y-4 lg:col-span-2">
            <QuickActions />
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  )
}
