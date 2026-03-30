'use client'

import { memo } from 'react'
import { Activity, Briefcase, Calendar, CheckCircle, Clock, FileText, Pencil } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import type { ActivityType } from '@/services/dashboard.service'
import { useRecentActivity } from '@/hooks/use-dashboard'

// helpers

function getRelativeTimestamp(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// icon map

const activityIconMap: Record<ActivityType, { Icon: LucideIcon; colorClass: string }> = {
  case_created: {
    Icon: Briefcase,
    colorClass: 'bg-primary/10 text-primary',
  },
  case_updated: {
    Icon: Pencil,
    colorClass: 'bg-muted text-muted-foreground',
  },
  hearing_added: {
    Icon: Calendar,
    colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  deadline_added: {
    Icon: Clock,
    colorClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  deadline_completed: {
    Icon: CheckCircle,
    colorClass: 'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  document_uploaded: {
    Icon: FileText,
    colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
}

// component

export const RecentActivity = memo(function RecentActivity() {
  const { activities, isLoading } = useRecentActivity()
  const MAX_SHOWN = 8
  const shown = activities.slice(0, MAX_SHOWN)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Recent activity</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="mt-0.5 h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Activity className="mb-2 h-8 w-8 text-muted-foreground/40" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
          </div>
        ) : (
          <div className="relative">
            <div
              className="absolute left-3.5 top-3.5 w-px bg-border"
              style={{ height: `calc(100% - 28px)` }}
              aria-hidden="true"
            />

            <div className="space-y-0">
              {shown.map((activity) => {
                const { Icon, colorClass } = activityIconMap[activity.type] ?? {
                  Icon: Activity,
                  colorClass: 'bg-muted text-muted-foreground',
                }

                return (
                  <div
                    key={activity.id}
                    className="relative flex items-start gap-3 py-2"
                  >
                    <div
                      className={cn(
                        'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                        colorClass,
                      )}
                      aria-hidden="true"
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="text-sm font-medium text-foreground leading-none">
                        {activity.title}
                      </p>
                      {activity.subtitle && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {activity.subtitle}
                        </p>
                      )}
                    </div>

                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums pt-0.5">
                      {getRelativeTimestamp(activity.timestamp)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
