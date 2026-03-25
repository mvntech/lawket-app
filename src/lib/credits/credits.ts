// server-side only (never import in client components or 'use client' files)

import { getSupabaseServer } from '@/lib/supabase/server'
import { CREDIT_COSTS, type AIFeature } from './constants'
import { logger, captureError } from '@/lib/analytics'

export interface CreditsData {
  balance: number
  lifetimeEarned: number
  adCreditsToday: number
  adCreditsResetAt: string
}

export interface CreditTransaction {
  id: string
  user_id: string
  amount: number
  type: string
  description: string | null
  reference: string | null
  created_at: string
}

interface CreditsRow {
  balance: number
  lifetime_earned: number
  ad_credits_today: number
  ad_credits_reset_at: string
  updated_at: string
}

// typescript can't resolve the new credits/credit_transactions table types in
// full compilation context due to supabase type inference complexity limits,
// these helpers cast the table builders to allow mutations while preserving
// typed column values
type CreditsUpdate = Partial<CreditsRow>
type CreditsTxInsert = Omit<CreditTransaction, 'id' | 'created_at'>

interface CreditsTableMutations {
  update: (v: CreditsUpdate) => { eq: (col: string, val: unknown) => Promise<unknown> }
}
interface CreditsTxTableMutations {
  insert: (v: CreditsTxInsert) => Promise<unknown>
}

function asCredits(from: unknown): CreditsTableMutations {
  return from as CreditsTableMutations
}
function asCreditsTx(from: unknown): CreditsTxTableMutations {
  return from as CreditsTxTableMutations
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = await getSupabaseServer()
  const result = await supabase
    .from('credits')
    .select('balance')
    .eq('user_id', userId)
    .single()
  const row = result.data as Pick<CreditsRow, 'balance'> | null
  return row?.balance ?? 0
}

export async function getCreditsData(userId: string): Promise<CreditsData> {
  const supabase = await getSupabaseServer()
  const result = await supabase
    .from('credits')
    .select('balance, lifetime_earned, ad_credits_today, ad_credits_reset_at')
    .eq('user_id', userId)
    .single()
  const row = result.data as Omit<CreditsRow, 'updated_at'> | null
  return {
    balance: row?.balance ?? 0,
    lifetimeEarned: row?.lifetime_earned ?? 0,
    adCreditsToday: row?.ad_credits_today ?? 0,
    adCreditsResetAt: row?.ad_credits_reset_at ?? '',
  }
}

export async function getTransactions(
  userId: string,
  limit = 20,
): Promise<CreditTransaction[]> {
  const supabase = await getSupabaseServer()
  const { data } = await supabase
    .from('credit_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as CreditTransaction[]
}

export async function canUseFeature(
  userId: string,
  feature: AIFeature,
): Promise<{ allowed: boolean; balance: number; cost: number; error?: string }> {
  const balance = await getBalance(userId)
  const cost = CREDIT_COSTS[feature]
  return {
    allowed: balance >= cost,
    balance,
    cost,
    error: balance < cost ? 'Insufficient credits' : undefined,
  }
}

export async function deductCredits(
  userId: string,
  feature: AIFeature,
  description?: string,
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  const supabase = await getSupabaseServer()
  const cost = CREDIT_COSTS[feature]

  // cast function name + args because supabase's RPC type inference doesn't
  // resolve the new deduct_credits function in full-project compilation
  const rpcArgs = { p_user_id: userId, p_amount: cost as number, p_description: description ?? 'AI: ' + feature }
  const { data, error } = await supabase.rpc(
    'deduct_credits' as Parameters<typeof supabase.rpc>[0],
    (rpcArgs as unknown) as Parameters<typeof supabase.rpc>[1],
  )

  const result = data as { success: boolean; balance: number; error?: string } | null

  if (error || !result?.success) {
    logger.warn(
      { userId, feature, error: result?.error ?? error },
      'Credit deduction failed',
    )
  }

  return {
    success: result?.success ?? false,
    newBalance: result?.balance ?? 0,
    error: result?.error,
  }
}

export async function addCredits(
  userId: string,
  amount: number,
  type: string,
  description: string,
  reference?: string,
): Promise<number> {
  const supabase = await getSupabaseServer()

  const currentResult = await supabase
    .from('credits')
    .select('balance, lifetime_earned')
    .eq('user_id', userId)
    .single()
  const current = currentResult.data as Pick<CreditsRow, 'balance' | 'lifetime_earned'> | null

  const newBalance = (current?.balance ?? 0) + amount
  const newLifetime = (current?.lifetime_earned ?? 0) + amount

  await asCredits(supabase.from('credits'))
    .update({
      balance: newBalance,
      lifetime_earned: newLifetime,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  await asCreditsTx(supabase.from('credit_transactions')).insert({
    user_id: userId,
    amount,
    type,
    description,
    reference: reference ?? null,
  })

  logger.info({ userId, amount, type }, 'Credits added')

  return newBalance
}

// re-export for use in AI routes (wraps canUseFeature for backward compat)
export async function canUseAIFeature(
  userId: string,
  feature: AIFeature,
): Promise<{ allowed: boolean; balance: number; cost: number }> {
  try {
    return await canUseFeature(userId, feature)
  } catch (err) {
    captureError(err, { feature, userId })
    return { allowed: false, balance: 0, cost: CREDIT_COSTS[feature] }
  }
}
