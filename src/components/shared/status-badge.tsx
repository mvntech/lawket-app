import { cn } from '@/lib/utils/cn'
import type { CaseStatus } from '@/types/common.types'

interface StatusBadgeProps {
  status: CaseStatus
  size?: 'sm' | 'md'
  className?: string
}

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-status-active-bg text-status-active-fg',
  },
  pending: {
    label: 'Pending',
    className: 'bg-status-pending-bg text-status-pending-fg',
  },
  closed: {
    label: 'Closed',
    className: 'bg-status-closed-bg text-status-closed-fg',
  },
  archived: {
    label: 'Archived',
    className: 'bg-status-archived-bg text-status-archived-fg',
  },
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium capitalize',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs',
        config.className,
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  )
}
