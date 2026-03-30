'use client'

import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { Calendar, MapPin, Briefcase, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import { AIButton } from '@/components/ai/ai-button'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import type { HearingModel } from '@/services/hearings.service'

interface HearingCardProps {
  hearing: HearingModel
  showCase?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onPrepare?: () => void
}

export function HearingCard({
  hearing: h,
  showCase = false,
  onEdit,
  onDelete,
  onPrepare,
}: HearingCardProps) {
  const router = useRouter()
  const hearingDate = parseISO(h.hearing_date)
  const isHearingToday = isToday(hearingDate)
  const isHearingTomorrow = isTomorrow(hearingDate)

  const formattedDate = format(hearingDate, 'EEEE, d MMMM yyyy')
  const formattedTime = h.hearing_time
    ? format(new Date(`1970-01-01T${h.hearing_time}`), 'h:mm a')
    : null

  return (
    <div className="group relative rounded-lg bg-card border border-border pl-4 pr-4 py-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h3 className="text-sm font-semibold text-foreground leading-snug">{h.title}</h3>
          {isHearingToday && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              Today
            </span>
          )}
          {isHearingTomorrow && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              Tomorrow
            </span>
          )}
        </div>

        {(onEdit || onDelete || onPrepare) && (
          <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            {onPrepare && (
              <AIButton label="Prepare" size="sm" onClick={onPrepare} />
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
                aria-label="Edit hearing"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={onDelete}
                aria-label="Delete hearing"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          {formattedDate}
          {formattedTime && <span className="ml-1">· {formattedTime}</span>}
        </span>
      </div>

      {h.court_name && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {h.court_name}
            {h.court_room && <span className="ml-1">· {h.court_room}</span>}
          </span>
        </div>
      )}

      {showCase && h.case_title && (
        <button
          type="button"
          onClick={() => router.push(ROUTES.cases.detail(h.case_id))}
          className={cn(
            'flex w-full items-center gap-1.5 text-xs text-muted-foreground',
            'hover:text-foreground hover:underline cursor-pointer transition-colors',
          )}
          aria-label={`View case: ${h.case_title}`}
        >
          <Briefcase className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{h.case_title}</span>
          <ChevronRight className="h-3 w-3 shrink-0 ml-auto" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
