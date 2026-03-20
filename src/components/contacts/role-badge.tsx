import { cn } from '@/lib/utils/cn'
import type { ContactRole } from '@/types/common.types'

// role config

const roleConfig: Record<ContactRole, { label: string; className: string }> = {
  client: {
    label: 'Client',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  },
  opposing_counsel: {
    label: 'Opposing',
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  },
  judge: {
    label: 'Judge',
    className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  },
  witness: {
    label: 'Witness',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  },
  expert: {
    label: 'Expert',
    className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-200',
  },
  court_staff: {
    label: 'Court Staff',
    className: 'bg-muted text-muted-foreground',
  },
  other: {
    label: 'Other',
    className: 'bg-muted text-muted-foreground',
  },
}

// props

interface RoleBadgeProps {
  role: ContactRole
  size?: 'sm' | 'md'
  className?: string
}

// component

export function RoleBadge({ role, size = 'md', className }: RoleBadgeProps) {
  const config = roleConfig[role]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
