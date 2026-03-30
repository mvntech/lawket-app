'use client'

import { useState } from 'react'
import { Coins, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FormPanel } from '@/components/shared/form-panel'
import { PackageCard } from './package-card'
import { AdRewardSection } from './ad-reward-section'
import { useCredits, useCheckout } from '@/hooks/use-credits'
import { CREDIT_PACKAGES } from '@/lib/credits/constants'
import { cn } from '@/lib/utils/cn'

interface CreditPurchaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreditPurchaseModal({ isOpen, onClose }: CreditPurchaseModalProps) {
  const [selectedPackageId, setSelectedPackageId] = useState('standard')
  const { data: creditsData } = useCredits()
  const { mutate: checkout, isPending } = useCheckout()

  const balance = creditsData?.balance ?? 0
  const selectedPkg = CREDIT_PACKAGES.find((p) => p.id === selectedPackageId)

  const balanceColor =
    balance > 20
      ? 'text-amber-500'
      : balance >= 5
        ? 'text-yellow-600'
        : 'text-destructive'

  function handlePurchase() {
    checkout(selectedPackageId)
  }

  const footer = (
    <div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} disabled={isPending} className="flex-1">
          Cancel
        </Button>
        <Button
          onClick={handlePurchase}
          disabled={!selectedPackageId || isPending}
          className="flex-1"
        >
          {isPending
            ? 'Opening checkout…'
            : selectedPkg
              ? 'Pay Rs ' + selectedPkg.pricePKR.toLocaleString('en-PK') + ' →'
              : 'Select a package'}
        </Button>
      </div>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <Lock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">
          Secure payment by LemonSqueezy (a Stripe company)
        </span>
      </div>
    </div>
  )

  return (
    <FormPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Get AI Credits"
      subtitle="Power your legal AI assistant"
      size="md"
      isLoading={isPending}
      footer={footer}
    >
      <div className="flex justify-between items-center mb-4 p-3 rounded-lg bg-muted">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Current balance</span>
        </div>
        <span className={cn('text-sm font-semibold', balanceColor)}>
          {balance} credits
        </span>
      </div>

      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Choose a package
      </p>

      <div className="flex flex-col gap-3">
        {CREDIT_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            isSelected={selectedPackageId === pkg.id}
            onSelect={() => setSelectedPackageId(pkg.id)}
            isLoading={isPending}
          />
        ))}
      </div>

      {selectedPkg && (
        <div className="mt-4 p-3 rounded-lg bg-accent border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">You&apos;ll receive:</span>
            <span className="text-sm font-semibold text-primary">
              {selectedPkg.credits} credits
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-sm font-bold text-foreground">
              Rs {selectedPkg.pricePKR.toLocaleString('en-PK')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ≈ ${selectedPkg.priceUSD} USD · Rs {selectedPkg.perCreditPKR} per credit
          </p>
        </div>
      )}

      <AdRewardSection />
    </FormPanel>
  )
}
