'use client'

import { CreditPurchaseModal } from './credit-purchase-modal'
import { useUiStore } from '@/stores/ui.store'

export function PurchaseModalProvider() {
  const isPurchaseModalOpen = useUiStore((s) => s.isPurchaseModalOpen)
  const closePurchaseModal = useUiStore((s) => s.closePurchaseModal)

  return (
    <CreditPurchaseModal isOpen={isPurchaseModalOpen} onClose={closePurchaseModal} />
  )
}
