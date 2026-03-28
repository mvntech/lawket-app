export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getCreditsData, type CreditTransaction } from '@/lib/credits/credits'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AD_CREDIT_VALUE, MAX_AD_PER_DAY } from '@/lib/credits/constants'
import { logger } from '@/lib/analytics'

// typescript type-inference helpers (see credits.ts for explanation)
interface CreditsUpdate {
  balance?: number; lifetime_earned?: number; ad_credits_today?: number; ad_credits_reset_at?: string; updated_at?: string
}
type TxInsert = Omit<CreditTransaction, 'id' | 'created_at'>
const asCredits = (v: unknown) => v as { update: (u: CreditsUpdate) => { eq: (c: string, v: unknown) => Promise<unknown> } }
const asCreditsTx = (v: unknown) => v as { insert: (u: TxInsert) => Promise<unknown> }

export async function POST() {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const data = await getCreditsData(userId)
  const today = new Date().toISOString().split('T')[0]!

  // reset daily counter if new day
  let todayCount = data.adCreditsToday
  if (data.adCreditsResetAt < today) {
    todayCount = 0
  }

  // enforce daily limit
  if (todayCount >= MAX_AD_PER_DAY) {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)

    return NextResponse.json(
      {
        error: 'Daily limit reached',
        message:
          'You can earn up to ' +
          MAX_AD_PER_DAY +
          ' free credits per day. Come back tomorrow!',
        resetsAt: tomorrow.toISOString(),
        adCreditsToday: todayCount,
      },
      { status: 429 },
    )
  }

  // award credit atomically
  const supabase = await getSupabaseServer()
  const newBalance = data.balance + AD_CREDIT_VALUE
  const newLifetime = data.lifetimeEarned + AD_CREDIT_VALUE

  await asCredits(supabase.from('credits'))
    .update({
      balance: newBalance,
      lifetime_earned: newLifetime,
      ad_credits_today: todayCount + 1,
      ad_credits_reset_at: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  await asCreditsTx(supabase.from('credit_transactions')).insert({
    user_id: userId,
    amount: AD_CREDIT_VALUE,
    type: 'ad_reward',
    description: 'Ad reward - 1 credit',
    reference: null,
  })

  logger.info({ userId, todayCount: todayCount + 1 }, 'Ad reward credit awarded')

  return NextResponse.json({
    success: true,
    creditsEarned: AD_CREDIT_VALUE,
    newBalance,
    adCreditsToday: todayCount + 1,
    remainingToday: MAX_AD_PER_DAY - (todayCount + 1),
  })
}
