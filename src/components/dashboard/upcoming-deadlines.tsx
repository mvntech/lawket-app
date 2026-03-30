'use client'

import { memo, useState } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle, ChevronRight, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { useMarkDeadlineComplete } from '@/hooks/use-deadlines'
import { cn } from '@/lib/utils/cn'
import type { DeadlinePriority } from '@/types/common.types'
import { ROUTES } from '@/lib/constants/routes'
import { useDashboardSummary } from '@/hooks/use-dashboard'

// helpers

function formatPastDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type DueUrgency = 'today' | 'tomorrow' | 'warning' | 'normal'

function getRelativeDue(dueDateStr: string): { label: string; urgency: DueUrgency } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDate = new Date(dueDateStr + 'T00:00:00')
  const diffMs = dueDate.getTime() - today.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { label: 'Today', urgency: 'today' }
  if (diffDays === 1) return { label: 'Tomorrow', urgency: 'tomorrow' }
  if (diffDays <= 3) return { label: `In ${diffDays} days`, urgency: 'warning' }
  return { label: `In ${diffDays} days`, urgency: 'normal' }
}

const urgencyClass: Record<DueUrgency, string> = {
  today: 'text-accent-foreground',
  tomorrow: 'text-primary',
  warning: 'text-primary',
  normal: 'text-muted-foreground',
}

// checkbox button

function CompleteButton({ deadlineId }: { deadlineId: string }) {
  const markComplete = useMarkDeadlineComplete()
  const [isTicked, setIsTicked] = useState(false)

  return (
    <button
      type="button"
      aria-label="Mark complete"
      disabled={markComplete.isPending || isTicked}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsTicked(true)
        markComplete.mutate(deadlineId, {
          onError: () => setIsTicked(false)
        })
      }}
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2',
        isTicked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        'transition-colors duration-150 hover:border-primary focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring',
        markComplete.isPending && 'opacity-50 cursor-not-allowed',
      )}
    >
      {markComplete.isPending ? (
        <span className="h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
      ) : isTicked ? (
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      ) : null}
    </button>
  )
}

// component

export const UpcomingDeadlines = memo(function UpcomingDeadlines() {
  const { summary, isLoading } = useDashboardSummary()
  const deadlines = summary?.upcomingDeadlines ?? []
  const overdueDeadlines = summary?.overdueDeadlines ?? []

  const MAX_OVERDUE = 2
  const MAX_UPCOMING = 3
  const shownOverdue = overdueDeadlines.slice(0, MAX_OVERDUE)
  const shownUpcoming = deadlines.slice(0, MAX_UPCOMING)
  const hasAny = overdueDeadlines.length > 0 || deadlines.length > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Deadlines</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
            ))}
          </div>
        ) : !hasAny ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <CheckCircle className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shownOverdue.map((deadline) => (
              <Link
                key={deadline.id}
                href={ROUTES.cases.detail(deadline.case_id)}
                className={cn(
                  "group flex items-center gap-4 border border-border rounded-md p-3 transition-all duration-200",
                  "hover:bg-muted active:bg-muted"
                )}
              >
                <div className="w-16 shrink-0 flex flex-col items-center justify-center gap-0.5">
                  <span className="text-xs font-bold text-destructive">
                    Overdue
                  </span>
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground leading-none">
                    {formatPastDate(deadline.due_date)}
                  </span>
                </div>

                <div className="w-px self-stretch bg-border shrink-0 my-0.5" />

                <div className="flex min-w-0 flex-1 gap-3 items-center">
                  <div className="shrink-0 scale-90 origin-left flex items-center">
                    <CompleteButton deadlineId={deadline.id} />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <h4 className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-destructive">
                      {deadline.title}
                    </h4>
                    {deadline.case_title && (
                      <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">
                        {deadline.case_title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center shrink-0">
                    <PriorityBadge priority={deadline.priority as DeadlinePriority} size="sm" />
                  </div>
                </div>
              </Link>
            ))}

            {shownUpcoming.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  {shownUpcoming.map((deadline) => {
                    const { label, urgency } = getRelativeDue(deadline.due_date);
                    return (
                      <Link
                        key={deadline.id}
                        href={ROUTES.cases.detail(deadline.case_id)}
                        className={cn(
                          "group relative flex items-center gap-4 border border-border/40 rounded-lg p-3 transition-all duration-200",
                          "hover:bg-muted/50 hover:border-border active:bg-muted"
                        )}
                      >
                        <div className="w-16 shrink-0 flex flex-col items-center justify-center gap-0.5">
                          <span className="text-xs font-bold text-primary">
                            Due Date
                          </span>
                          <span className="text-xs font-semibold tabular-nums text-muted-foreground leading-none">
                            {formatPastDate(deadline.due_date)}
                          </span>
                        </div>

                        <div className="w-px self-stretch bg-border shrink-0 my-0.5" />

                        <div className="flex min-w-0 flex-1 gap-3 items-center">
                          <div className="shrink-0 scale-90 origin-left flex items-center">
                            <CompleteButton deadlineId={deadline.id} />
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <h4 className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                              {deadline.title}
                            </h4>
                            {deadline.case_title && (
                              <p className="truncate text-xs font-medium text-muted-foreground mt-0.5 opacity-70">
                                {deadline.case_title}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
                          <span className={cn('text-[10px] font-bold tabular-nums uppercase tracking-tight', urgencyClass[urgency])}>
                            {label}
                          </span>
                          <PriorityBadge priority={deadline.priority as DeadlinePriority} size="sm" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-3">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {overdueDeadlines.length > 0 && (
                    <>
                      {overdueDeadlines.length} Overdue<span className="mx-1">•</span>
                    </>
                  )}
                  {shownUpcoming.length > 0 && (
                    <>
                      {shownUpcoming.length} Upcoming
                    </>
                  )}
                </span>
              </div>

              <Link
                href={ROUTES.calendar}
                className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View All</span>
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
