'use client'

import { Coins } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCredits } from '@/hooks/use-credits'

interface CreditBalanceProps {
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  onClick?: () => void
  className?: string
}

export function CreditBalance({
  size = 'sm',
  showLabel = false,
  onClick,
  className,
}: CreditBalanceProps) {
  const { data, isLoading } = useCredits()
  const balance = data?.balance ?? 0

  if (isLoading) {
    return (
      <div
        className={cn(
          'rounded-full bg-muted animate-pulse',
          size === 'xs' ? 'h-4 w-10' : size === 'sm' ? 'h-5 w-12' : 'h-6 w-14',
          className,
        )}
      />
    )
  }

  const iconSize =
    size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  const textClass =
    size === 'xs' ? 'text-xs' : size === 'sm' ? 'text-sm' : 'text-base font-medium'

  const colorClass =
    balance > 20
      ? 'text-amber-500'
      : balance >= 5
        ? 'text-yellow-600'
        : 'text-destructive animate-pulse'

  const content = (
    <span
      className={cn('flex items-center gap-1', colorClass, className)}
      title={`${balance} AI credits remaining`}
    >
      <Coins className={cn(iconSize, 'shrink-0')} aria-hidden="true" />
      <span className={textClass}>{balance}</span>
      {showLabel && (
        <span className={cn(textClass, 'text-muted-foreground')}>credits</span>
      )}
    </span>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        {content}
      </button>
    )
  }

  return content
}
