'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AIButtonProps {
  onClick: () => void
  isLoading?: boolean
  disabled?: boolean
  label?: string
  size?: 'sm' | 'md'
  className?: string
}

export function AIButton({
  onClick,
  isLoading = false,
  disabled = false,
  label = 'AI assist',
  size = 'md',
  className,
}: AIButtonProps) {
  const isDisabled = disabled || isLoading

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-medium transition-all',
        'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground',
        !isDisabled && 'ai-shimmer',
        size === 'sm' && 'text-xs px-2.5 py-1',
        size === 'md' && 'text-sm px-3 py-1.5',
        className,
      )}
    >
      {isLoading ? (
        <Loader2
          className={cn('shrink-0 animate-spin', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
          aria-hidden="true"
        />
      ) : (
        <Sparkles
          className={cn('shrink-0', size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5')}
          aria-hidden="true"
        />
      )}
      {label}
    </button>
  )
}
