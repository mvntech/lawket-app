'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { captureException } from '@/lib/analytics'

interface ErrorStateProps {
  title?: string
  subtitle?: string
  onRetry?: () => void
  error?: Error
}

export function ErrorState({
  title = 'Something went wrong',
  subtitle = 'An error occurred. Please try again.',
  onRetry,
  error,
}: ErrorStateProps) {
  const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'

  useEffect(() => {
    if (error) captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[320px] px-4 text-center">
      <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-destructive/10 mb-4">
        <AlertCircle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{subtitle}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
      {isDev && error?.message && (
        <p className="mt-4 text-xs text-muted-foreground font-mono max-w-sm break-all">
          {error.message}
        </p>
      )}
    </div>
  )
}
