'use client'

import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useDashboardSummary } from '@/hooks/use-dashboard'

// types

interface OverdueAlertProps {
  onView: () => void
}

// component

export const OverdueAlert = memo(function OverdueAlert({ onView }: OverdueAlertProps) {
  const { summary } = useDashboardSummary()
  const overdueCount = summary?.overdueDeadlines.length ?? 0

  if (overdueCount === 0) return null

  const label = overdueCount === 1 ? 'overdue deadline' : 'overdue deadlines'

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-red-50 px-4 py-3 dark:bg-red-950/30"
      role="alert"
    >
      <AlertTriangle
        className="h-5 w-5 shrink-0 animate-[pulse_2s_ease-in-out_infinite] text-destructive"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-destructive">
          {overdueCount} {label}
        </p>
        <p className="text-xs text-muted-foreground">Immediate attention required</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onView}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        View deadlines
      </Button>
    </motion.div>
  )
})
