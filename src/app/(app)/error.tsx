'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/shared/error-state'
import { captureException } from '@/lib/analytics'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function AppError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    captureException(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] px-4">
      <ErrorState
        error={error}
        title="Something went wrong"
        subtitle="An unexpected error occurred. Please try again or refresh the page."
        onRetry={reset}
      />
      <Button
        variant="ghost"
        className="mt-2 text-muted-foreground"
        onClick={() => window.location.assign('/dashboard')}
      >
        Go to dashboard
      </Button>
    </div>
  )
}
