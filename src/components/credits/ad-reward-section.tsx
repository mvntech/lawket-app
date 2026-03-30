'use client'

import { Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCredits, useAdReward } from '@/hooks/use-credits'
import { MAX_AD_PER_DAY } from '@/lib/credits/constants'

export function AdRewardSection() {
  const { data } = useCredits()
  const { mutate, isPending } = useAdReward()

  const today = new Date().toISOString().split('T')[0]!
  const adCreditsToday =
    data && data.adCreditsResetAt >= today ? data.adCreditsToday : 0
  const remaining = MAX_AD_PER_DAY - adCreditsToday

  function handleWatchAd() {
    if (process.env.NEXT_PUBLIC_APP_ENV === 'development') {
      toast.info('Simulating ad (dev mode)...')
      setTimeout(() => mutate(), 2000)
    } else {
      // production: integrate Google AdSense rewarded ad
      // on completion: mutate()
      // on skip: toast.error('Watch the complete ad to earn')
      mutate()
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          or earn free credits
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="mt-3 border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Play className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Watch a short ad</p>
              <p className="text-xs text-muted-foreground">
                {remaining > 0
                  ? `${remaining} of ${MAX_AD_PER_DAY} remaining today`
                  : 'Come back tomorrow'}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className="bg-primary text-black text-xs font-bold px-2 py-0.5 rounded-full">
              +1 credit
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={remaining === 0 || isPending}
              onClick={handleWatchAd}
            >
              {isPending ? (
                <span className="flex items-center gap-1">
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Watching…
                </span>
              ) : (
                'Watch ad'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
