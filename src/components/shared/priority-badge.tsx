 import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { DeadlinePriority } from '@/types/common.types'

interface PriorityBadgeProps {
  priority: DeadlinePriority
  size?: 'sm' | 'md'
  className?: string
}

const priorityConfig: Record<
  DeadlinePriority,
  { label: string; className: string; showArrow: boolean }
> = {
  low: {
    label: 'Low',
    className: 'bg-muted text-muted-foreground',
    showArrow: false,
  },
  medium: {
    label: 'Medium',
    className: 'bg-priority-medium-bg text-priority-medium-fg',
    showArrow: false,
  },
  high: {
    label: 'High',
    className: 'bg-priority-high-bg text-priority-high-fg',
    showArrow: true,
  },
  critical: {
    label: 'Critical',
    className: 'bg-priority-critical-bg text-priority-critical-fg',
    showArrow: true,
  },
}

export function PriorityBadge({ priority, size = 'md', className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium capitalize',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className,
        className,
      )}
    >
      {config.showArrow && (
        <ArrowUp className={cn('shrink-0', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} aria-hidden="true" />
      )}
      {config.label}
    </span>
  )
}
