'use client'

import { CheckCircle2, Coins } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { CreditPackage } from '@/lib/credits/constants'

interface PackageCardProps {
  package: CreditPackage
  isSelected: boolean
  onSelect: () => void
  isLoading: boolean
}

export function PackageCard({
  package: pkg,
  isSelected,
  onSelect,
  isLoading,
}: PackageCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onSelect()
      }}
      className={cn(
        'relative cursor-pointer rounded-xl border p-5 transition-all duration-200',
        'bg-background/60 backdrop-blur text-center',
        'hover:shadow-md hover:border-border',

        // selected
        isSelected &&
        'border-primary/70 bg-primary/5 shadow-lg ring-1 ring-primary/30 scale-[1.01]',

        // popular
        pkg.isPopular && !isSelected && 'border-primary/40',

        isLoading && 'opacity-70 pointer-events-none'
      )}
    >
      {pkg.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="text-[10px] font-medium px-3 py-1 rounded-full bg-primary text-primary-foreground shadow-sm">
            Most popular
          </span>
        </div>
      )}

      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {pkg.name}
      </p>

      <div className="mt-2 flex items-center justify-center gap-1 text-sm font-medium">
        <Coins className="h-4 w-4 text-primary/70" />
        {pkg.credits} credits
      </div>

      <div className="mt-4">
        <div className="flex items-end justify-center gap-2">
          <p className="text-3xl font-semibold tracking-tight">
            Rs {pkg.pricePKR.toLocaleString('en-PK')}
          </p>

          {pkg.originalPricePKR && (
            <span className="text-sm text-muted-foreground line-through">
              {pkg.originalPricePKR.toLocaleString('en-PK')}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          ≈ ${pkg.priceUSD} USD
        </p>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Rs {pkg.perCreditPKR} per credit
      </p>

      <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
        {pkg.description}
      </p>
      <div className="mt-5">
        <div
          className={cn(
            'w-full rounded-md px-3 py-2 text-sm font-medium transition',
            isSelected
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/70 text-foreground'
          )}
        >
          {isSelected ? (
            <span className="flex items-center justify-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              Selected
            </span>
          ) : (
            'Select plan'
          )}
        </div>
      </div>

      {pkg.discountPercent !== undefined && (
        <span className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {pkg.discountPercent}% off
        </span>
      )}
    </div>
  )
}