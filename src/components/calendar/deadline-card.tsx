'use client'

import { useRouter } from 'next/navigation'
import { format, isPast, parseISO, startOfDay } from 'date-fns'
import { Clock, Briefcase, ChevronRight, Pencil, Trash2, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PriorityBadge } from '@/components/shared/priority-badge'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import type { DeadlineModel } from '@/services/deadlines.service'
import type { DeadlinePriority } from '@/types/common.types'

interface DeadlineCardProps {
  deadline: DeadlineModel
  showCase?: boolean
  onEdit?: () => void
  onDelete?: () => void
  onComplete?: () => void
}

export function DeadlineCard({
  deadline: d,
  showCase = false,
  onEdit,
  onDelete,
  onComplete,
}: DeadlineCardProps) {
  const router = useRouter()
  const dueDate = parseISO(d.due_date)
  const isOverdue = !d.is_completed && isPast(startOfDay(dueDate)) && dueDate < startOfDay(new Date())
  const formattedDate = format(dueDate, 'EEE, d MMM yyyy')
  const formattedTime = d.due_time
    ? format(new Date(`1970-01-01T${d.due_time}`), 'h:mm a')
    : null

  const priority = d.priority as DeadlinePriority

  return (
    <div
      className={cn(
        'group relative rounded-lg bg-card border border-border pl-4 pr-4 py-3 space-y-2',
        isOverdue && 'bg-destructive/5 border-destructive/30',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onComplete}
          disabled={d.is_completed || !onComplete}
          aria-label={d.is_completed ? 'Completed' : 'Mark as complete'}
          className={cn(
            'mt-0.5 shrink-0 text-muted-foreground transition-colors',
            !d.is_completed && onComplete && 'hover:text-primary cursor-pointer',
            d.is_completed && 'text-primary cursor-default',
          )}
        >
          {d.is_completed ? (
            <CheckSquare className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Square className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <h3
                className={cn(
                  'text-sm font-semibold text-foreground leading-snug',
                  d.is_completed && 'line-through text-muted-foreground',
                )}
              >
                {d.title}
              </h3>
              <PriorityBadge priority={priority} size="sm" />
              {isOverdue && (
                <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                  Overdue
                </span>
              )}
            </div>

            {(onEdit || onDelete) && (
              <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={onEdit}
                    aria-label="Edit deadline"
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
                    aria-label="Delete deadline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>
              {formattedDate}
              {formattedTime && <span className="ml-1">· {formattedTime}</span>}
            </span>
          </div>

          {showCase && d.case_title && (
            <button
              type="button"
              onClick={() => router.push(ROUTES.cases.detail(d.case_id))}
              className={cn(
                'flex w-full items-center gap-1.5 text-xs text-muted-foreground mt-1',
                'hover:text-foreground hover:underline cursor-pointer transition-colors',
              )}
              aria-label={`View case: ${d.case_title}`}
            >
              <Briefcase className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{d.case_title}</span>
              <ChevronRight className="h-3 w-3 shrink-0 ml-auto" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
