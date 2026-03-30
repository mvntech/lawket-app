'use client'

import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCredits } from '@/hooks/use-credits'

interface AIPanelTriggerProps {
  onClick: () => void
  isOpen?: boolean
  className?: string
}

export function AIPanelTrigger({
  onClick,
  isOpen = false,
  className,
}: AIPanelTriggerProps) {
  const { data: credits } = useCredits()
  const balance = credits?.balance ?? 0

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Lawket AI assistant"
      className={cn(
        // base (shared all sizes)
        'fixed z-50',
        'flex items-center justify-center',
        'bg-primary text-primary-foreground',
        'shadow-lg',
        'transition-all duration-200',
        'hover:brightness-110',
        'active:scale-95',
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-primary',
        'focus-visible:ring-offset-2',

        // mobile (FAB bottom right, above mobile nav - bottom-20)
        'bottom-20 right-8',
        'w-14 h-14 rounded-full',

        // desktop (pill on right edge, vertically centered, rounded left only)
        'md:bottom-auto md:top-1/2',
        'md:-translate-y-1/2',
        'md:right-0',
        'md:w-auto md:h-auto',
        'md:rounded-l-2xl md:rounded-r-none',
        'md:px-3 md:py-5',
        'md:flex-col md:gap-2',

        // hide on mobile when panel is open (panel takes full screen)
        // keep on desktop even when open (panel is sidebar)
        isOpen ? 'hidden md:flex' : 'flex',

        className,
      )}
    >
      <Sparkles
        className={cn(
          'shrink-0',
          'w-6 h-6',
          'md:w-5 md:h-5',
        )}
        aria-hidden="true"
      />

      <span
        className={cn(
          'hidden md:block',
          'text-xs font-semibold',
          'tracking-widest uppercase',
          'select-none whitespace-nowrap',
          '[writing-mode:vertical-rl]',
          'rotate-180',
        )}
      >
        AI
      </span>

      <span
        className={cn(
          'absolute',
          '-top-1 -right-1',
          'md:-top-2 md:-right-2',
          'min-w-[20px] h-5',
          'px-1 rounded-full',
          'flex items-center justify-center',
          'text-[10px] font-bold',
          'border-2 border-background',
          balance === 0
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground',
        )}
        aria-label={balance + ' credits'}
      >
        {balance > 99 ? '99+' : balance}
      </span>
    </button>
  )
}
