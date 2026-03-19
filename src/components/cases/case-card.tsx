'use client'

import { formatDistanceToNow } from 'date-fns'
import { Clock, MapPin, WifiOff } from 'lucide-react'
import { StatusBadge } from '@/components/shared/status-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils/cn'
import type { CaseModel } from '@/services/cases.service'

interface CaseCardProps {
  case: CaseModel
  onClick?: () => void
}

export function CaseCard({ case: c, onClick }: CaseCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onClick()
    }
  }

  const relativeTime = formatDistanceToNow(new Date(c.updated_at), { addSuffix: true })

  return (
    <div
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `View case: ${c.title}` : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'relative rounded-lg border bg-card p-4 transition-shadow duration-200',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >

      {c._dirty && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute top-3 right-3 flex items-center gap-1">
              {!navigator?.onLine ? (
                <WifiOff className="h-3 w-3 text-amber-500" aria-hidden="true" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              )}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>Pending sync</p>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground truncate">
          {c.case_number}
        </span>
        <StatusBadge status={c.status} size="sm" />
      </div>

      <h3 className="mt-1 text-sm font-semibold text-foreground truncate">{c.title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground truncate">
        Client: {c.client_name}
      </p>

      <div className="mt-3 pt-3 border-t flex items-center gap-3 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize shrink-0">
          {c.case_type}
        </span>

        {c.court_name && (
          <span className="flex items-center gap-1 min-w-0 truncate">
            <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{c.court_name}</span>
          </span>
        )}

        <span className="ml-auto flex items-center gap-1 shrink-0">
          <Clock className="h-3 w-3" aria-hidden="true" />
          {relativeTime}
        </span>
      </div>
    </div>
  )
}
