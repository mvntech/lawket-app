'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  // auto-retry when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      router.back()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [router])

  const handleRetry = () => {
    setRetrying(true)
    if (navigator.onLine) {
      router.back()
    } else {
      // brief visual feedback before resetting
      setTimeout(() => setRetrying(false), 1000)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <WifiOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">No internet connection</h1>
        <p className="text-sm text-muted-foreground">
          Check your internet connection then try again.
        </p>
      </div>
      <Button onClick={handleRetry} disabled={retrying}>
        {retrying ? 'Checking…' : 'Retry'}
      </Button>
    </div>
  )
}
