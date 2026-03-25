'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { queryKeys } from '@/lib/constants/query-keys'
import type { CreditTransaction } from '@/lib/credits/credits'

export interface CreditsBalance {
  balance: number
  lifetimeEarned: number
  adCreditsToday: number
  adCreditsResetAt: string
  recentTransactions: CreditTransaction[]
}

export function useCredits() {
  return useQuery({
    queryKey: queryKeys.credits.balance(),
    queryFn: async (): Promise<CreditsBalance> => {
      const res = await fetch('/api/credits/balance')
      if (!res.ok) throw new Error('Failed to fetch credits')
      return res.json() as Promise<CreditsBalance>
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useAdReward() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<{
      success: boolean
      creditsEarned: number
      newBalance: number
      adCreditsToday: number
      remainingToday: number
    }> => {
      const res = await fetch('/api/credits/ad-reward', { method: 'POST' })
      const data = (await res.json()) as {
        success?: boolean
        creditsEarned?: number
        newBalance?: number
        adCreditsToday?: number
        remainingToday?: number
        message?: string
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? 'Ad reward failed')
      }
      return {
        success: data.success ?? false,
        creditsEarned: data.creditsEarned ?? 0,
        newBalance: data.newBalance ?? 0,
        adCreditsToday: data.adCreditsToday ?? 0,
        remainingToday: data.remainingToday ?? 0,
      }
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.credits.balance() })
      toast.success('+1 credit earned!', {
        description: 'Balance: ' + data.newBalance + ' credits',
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not earn credit')
    },
  })
}

export function useCheckout() {
  return useMutation({
    mutationFn: async (
      packageId: string,
    ): Promise<{
      checkoutUrl: string
      packageName: string
      credits: number
      pricePKR: number
      devMode?: boolean
    }> => {
      const res = await fetch('/api/credits/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const data = (await res.json()) as {
        checkoutUrl?: string
        packageName?: string
        credits?: number
        pricePKR?: number
        devMode?: boolean
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error ?? 'Checkout failed')
      }
      return {
        checkoutUrl: data.checkoutUrl ?? '',
        packageName: data.packageName ?? '',
        credits: data.credits ?? 0,
        pricePKR: data.pricePKR ?? 0,
        devMode: data.devMode,
      }
    },
    onSuccess: (data) => {
      // redirect to LemonSqueezy (or dev success page)
      window.location.href = data.checkoutUrl
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not open checkout')
    },
  })
}
