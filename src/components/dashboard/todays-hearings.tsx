'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Calendar, ChevronRight, MapPin } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { ROUTES } from '@/lib/constants/routes'
import { useDashboardSummary } from '@/hooks/use-dashboard'

// helpers

function formatTime(time: string | null | undefined): string {
  if (!time) return 'Time TBC'
  const [hoursStr, minutesStr] = time.split(':')
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const h = hours % 12 || 12
  const ampm = hours < 12 ? 'AM' : 'PM'
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`
}

// component

export const TodaysHearings = memo(function TodaysHearings() {
  const { summary, isLoading } = useDashboardSummary()
  const hearings = summary?.todayHearings ?? []

  const MAX_SHOWN = 3
  const shown = hearings.slice(0, MAX_SHOWN)
  const remaining = hearings.length - MAX_SHOWN

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Today&apos;s hearings</CardTitle>
          {hearings.length === 0 && !isLoading && (
            <span className="ml-auto text-xs text-muted-foreground">No hearings today</span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-4 w-16 shrink-0 mt-0.5" />
                <div className="w-px bg-border shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : hearings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Calendar className="mb-2 h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Clear schedule today</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {shown.map((hearing) => (
              <Link
                key={hearing.id}
                href={ROUTES.cases.detail(hearing.case_id)}
                className={cn(
                  "group flex items-baseline gap-4 border border-border rounded-md p-3 transition-all duration-200",
                  "hover:bg-muted active:bg-muted"
                )}
              >
                <span className="w-16 shrink-0 text-sm font-bold tabular-nums text-foreground">
                  {formatTime(hearing.hearing_time)}
                </span>

                <div className="w-px self-stretch bg-border shrink-0 my-0.5" />

                <div className="flex min-w-0 flex-1 flex-col">
                  <h4 className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                    {hearing.title}
                  </h4>

                  {(hearing.case_title || hearing.court_name) && (
                    <p className="truncate text-xs font-medium text-muted-foreground mt-0.5">
                      {hearing.case_title}
                      {hearing.case_title && hearing.court_name && <span className="mx-1">•</span>}
                      <span>{hearing.court_name}</span>
                    </p>
                  )}
                </div>
              </Link>
            ))}

            <div className="mt-2 flex items-center justify-between border-t border-border/40 pt-3">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">
                  {hearings.length} {hearings.length === 1 ? 'Hearing' : 'Total Hearings'}
                </span>
              </div>

              <Link
                href={ROUTES.calendar}
                className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{remaining > 0 ? `+${remaining} more` : 'View All'}</span>
                <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
