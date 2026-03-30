'use client'

import { memo, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

// types

interface Trend {
  value: number
  direction: 'up' | 'down' | 'neutral'
  label: string
}

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: Trend
  onClick?: () => void
  isLoading?: boolean
}

// trend icon + color

const trendConfig = {
  up: { Icon: TrendingUp, className: 'text-green-600 dark:text-green-400' },
  down: { Icon: TrendingDown, className: 'text-destructive' },
  neutral: { Icon: Minus, className: 'text-muted-foreground' },
}

// component

export const StatCard = memo(function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
  isLoading = false,
}: StatCardProps) {
  const countRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  // count-up animation using requestAnimationFrame
  useEffect(() => {
    if (isLoading || typeof value !== 'number' || hasAnimated.current) return
    hasAnimated.current = true

    const target = value
    const duration = 600
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(eased * target)

      if (countRef.current) {
        countRef.current.textContent = String(current)
      }

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, isLoading])

  if (isLoading) {
    return (
      <Card className="p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </Card>
    )
  }

  const { Icon: TrendIcon, className: trendClass } = trend ? trendConfig[trend.direction] : trendConfig.neutral

  return (
    <Card
      className={cn(
        'p-6 space-y-3 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:border-primary/30',
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </div>

      <p className="text-3xl font-bold text-foreground tabular-nums">
        {typeof value === 'number' ? (
          <span ref={countRef}>0</span>
        ) : (
          value
        )}
      </p>

      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}

      {trend && (
        <div className={cn('flex items-center gap-1 text-xs', trendClass)}>
          <TrendIcon className="h-3 w-3" aria-hidden="true" />
          <span>
            {trend.value}% {trend.label}
          </span>
        </div>
      )}
    </Card>
  )
})
