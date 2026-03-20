import { cn } from '@/lib/utils/cn'

// helpers

const LIGHT_COLORS = [
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100',
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100',
  'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100',
  'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100',
]

function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % LIGHT_COLORS.length
  return LIGHT_COLORS[index]!
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return (words[0]![0] ?? '').toUpperCase()
  return ((words[0]![0] ?? '') + (words[words.length - 1]![0] ?? '')).toUpperCase()
}

// size map

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

// props

interface ContactAvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// component

export function ContactAvatar({ name, size = 'md', className }: ContactAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold select-none',
        getAvatarColor(name || 'N/A'),
        sizeClasses[size],
        className,
      )}
    >
      {getInitials(name || 'N/A')}
    </div>
  )
}
