'use client'

import { useState, useEffect } from 'react'
import {
  Coins,
  Gift,
  CreditCard,
  Play,
  Sparkles,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { AdRewardSection } from '@/components/credits/ad-reward-section'
import { CreditPurchaseModal } from '@/components/credits/credit-purchase-modal'
import { useCredits } from '@/hooks/use-credits'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils/cn'
import type { CreditTransaction } from '@/lib/credits/credits'

const CREDIT_COSTS_DISPLAY = [
  { label: 'Summarize case', cost: 1 },
  { label: 'Review notes', cost: 1 },
  { label: 'Chat message', cost: 1 },
  { label: 'Prep for hearing', cost: 2 },
  { label: 'Analyze document', cost: 2 },
  { label: 'Draft section', cost: 2 },
]

function TransactionIcon({ type }: { type: string }) {
  switch (type) {
    case 'signup_bonus':
      return <Gift className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
    case 'purchase':
      return <CreditCard className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
    case 'ad_reward':
      return <Play className="h-4 w-4 text-blue-500 shrink-0" aria-hidden="true" />
    case 'ai_use':
      return (
        <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
      )
    case 'refund':
      return <RotateCcw className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
    default:
      return <Coins className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
  }
}

function formatTxDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const relative = formatDistanceToNow(date, { addSuffix: true })
    const absolute = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${relative} · ${absolute}`
  } catch {
    return dateStr
  }
}

export function CreditsClient() {
  const { data, isLoading } = useCredits()
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [allTransactions, setAllTransactions] = useState<CreditTransaction[]>([])
  const [txPage, setTxPage] = useState(30)
  const [isFetchingMore, setIsFetchingMore] = useState(false)

  const balance = data?.balance ?? 0
  const lifetimeEarned = data?.lifetimeEarned ?? 0

  useEffect(() => {
    async function fetchAll() {
      try {
        const res = await fetch('/api/credits/balance')
        if (!res.ok) return
        const json = (await res.json()) as { recentTransactions?: CreditTransaction[] }
        setAllTransactions(json.recentTransactions ?? [])
      } catch {
        // silently fail
      }
    }
    void fetchAll()
  }, [])

  async function loadMore() {
    setIsFetchingMore(true)
    try {
      const res = await fetch(`/api/credits/transactions?limit=${txPage + 30}`)
      if (res.ok) {
        const json = (await res.json()) as { transactions?: CreditTransaction[] }
        setAllTransactions(json.transactions ?? allTransactions)
        setTxPage((p) => p + 30)
      }
    } catch {
      // silently fail
    } finally {
      setIsFetchingMore(false)
    }
  }

  return (
    <>
      <PageHeader title="Credits" backHref={ROUTES.settings.root} />

      <div className="px-4 md:px-6 pb-8 pt-4 space-y-6 max-w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-6 text-center">
              <Coins className="h-12 w-12 text-amber-500 mx-auto mb-3" aria-hidden="true" />
              {isLoading ? (
                <div className="h-12 w-24 rounded bg-muted animate-pulse mx-auto" />
              ) : (
                <p className="text-5xl font-bold text-primary">{balance}</p>
              )}
              <p className="text-lg text-muted-foreground mt-1">AI Credits</p>
              <p className="text-sm text-muted-foreground mt-2">
                Lifetime earned: {lifetimeEarned} credits
              </p>
            </div>

            <Button
              onClick={() => setIsPurchaseModalOpen(true)}
              className="w-full"
              size="lg"
            >
              Buy credits
            </Button>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">What can you do?</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {CREDIT_COSTS_DISPLAY.map(({ label, cost }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <CheckCircle2
                      className={cn(
                        'h-3.5 w-3.5 shrink-0',
                        cost === 1 ? 'text-green-500' : 'text-amber-500',
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {cost} cr
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-4">
                1 credit = Rs 50 value
              </p>
            </div>

            <AdRewardSection />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold">History</h2>
            {allTransactions.length > 0 && (
              <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                {allTransactions.length}
              </span>
            )}
          </div>

          {allTransactions.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          )}

          <div className="divide-y divide-border">
            {allTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <TransactionIcon type={tx.type} />
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {tx.description ?? tx.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTxDate(tx.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'text-sm font-mono ml-4 shrink-0',
                    tx.amount > 0 ? 'text-green-600' : 'text-muted-foreground',
                  )}
                >
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>

          {allTransactions.length >= 30 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4"
              onClick={() => void loadMore()}
              disabled={isFetchingMore}
            >
              {isFetchingMore ? 'Loading...' : 'Load more'}
            </Button>
          )}
        </div>
      </div>

      <CreditPurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
      />
    </>
  )
}
