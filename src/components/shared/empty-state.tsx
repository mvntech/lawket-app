'use client'

import { useReducedMotion, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle: string
  ctaLabel?: string
  onCta?: () => void
  ctaHref?: string
}

export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctaLabel,
  onCta,
  ctaHref,
}: EmptyStateProps) {
  const prefersReduced = useReducedMotion()

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-80 px-4 text-center"
      initial={prefersReduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-muted mb-4">
        <Icon className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{subtitle}</p>
      {ctaLabel && (onCta || ctaHref) && (
        ctaHref ? (
          <Button asChild>
            <a href={ctaHref}>{ctaLabel}</a>
          </Button>
        ) : (
          <Button onClick={onCta}>{ctaLabel}</Button>
        )
      )}
    </motion.div>
  )
}
