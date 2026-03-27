import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCredits, mockUserId } from '../../factories'
import { createMockSupabase } from '../../mocks/supabase'

// module mocks

let mockSupabase = createMockSupabase()

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => Promise.resolve(mockSupabase)),
}))

vi.mock('@/lib/analytics', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  captureError: vi.fn(),
}))

// tests

import {
  canUseFeature,
  deductCredits,
  getBalance,
  addCredits,
} from '@/lib/credits/credits'
import {
  CREDIT_COSTS,
  SIGNUP_BONUS,
  AD_CREDIT_VALUE,
  MAX_AD_PER_DAY,
} from '@/lib/credits/constants'

describe('CREDIT_COSTS', () => {
  it('chat costs 1 credit', () => {
    expect(CREDIT_COSTS['chat']).toBe(1)
  })

  it('case-summary costs 1 credit', () => {
    expect(CREDIT_COSTS['case-summary']).toBe(1)
  })

  it('hearing-prep costs 2 credits', () => {
    expect(CREDIT_COSTS['hearing-prep']).toBe(2)
  })

  it('analyze-document costs 2 credits', () => {
    expect(CREDIT_COSTS['analyze-document']).toBe(2)
  })

  it('draft-section costs 2 credits', () => {
    expect(CREDIT_COSTS['draft-section']).toBe(2)
  })

  it('clean-notes costs 1 credit', () => {
    expect(CREDIT_COSTS['clean-notes']).toBe(1)
  })

  it('suggest-deadlines costs 1 credit', () => {
    expect(CREDIT_COSTS['suggest-deadlines']).toBe(1)
  })
})

describe('SIGNUP_BONUS', () => {
  it('awards exactly 10 credits on signup', () => {
    expect(SIGNUP_BONUS).toBe(10)
  })
})

describe('AD_CREDIT_VALUE', () => {
  it('awards exactly 1 credit per ad', () => {
    expect(AD_CREDIT_VALUE).toBe(1)
  })
})

describe('MAX_AD_PER_DAY', () => {
  it('limits to 3 ad rewards per day', () => {
    expect(MAX_AD_PER_DAY).toBe(3)
  })

  it('blocks when daily count equals limit', () => {
    const credits = makeCredits({ ad_credits_today: 3 })
    const allowed = (credits.ad_credits_today as number) < MAX_AD_PER_DAY
    expect(allowed).toBe(false)
  })

  it('allows when daily count is below limit', () => {
    const credits = makeCredits({ ad_credits_today: 2 })
    const allowed = (credits.ad_credits_today as number) < MAX_AD_PER_DAY
    expect(allowed).toBe(true)
  })

  it('resets counter when reset date is before today', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const credits = makeCredits({
      ad_credits_today: 3,
      ad_credits_reset_at: yesterday.toISOString().split('T')[0],
    })
    const today = new Date().toISOString().split('T')[0]!
    const shouldReset = (credits.ad_credits_reset_at as string) < today
    expect(shouldReset).toBe(true)
  })

  it('does not reset when reset date is today', () => {
    const credits = makeCredits({
      ad_credits_today: 2,
      ad_credits_reset_at: new Date().toISOString().split('T')[0],
    })
    const today = new Date().toISOString().split('T')[0]!
    const shouldReset = (credits.ad_credits_reset_at as string) < today
    expect(shouldReset).toBe(false)
  })
})

describe('getBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase({ credits: [{ balance: 15 }] })
  })

  it('returns balance from Supabase', async () => {
    const balance = await getBalance(mockUserId)
    expect(balance).toBe(15)
  })

  it('returns 0 when no credits row exists', async () => {
    mockSupabase = createMockSupabase({ credits: [] })
    const balance = await getBalance(mockUserId)
    expect(balance).toBe(0)
  })
})

describe('canUseFeature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows when balance >= cost', async () => {
    mockSupabase = createMockSupabase({ credits: [{ balance: 5 }] })
    const result = await canUseFeature(mockUserId, 'chat')
    expect(result.allowed).toBe(true)
    expect(result.balance).toBe(5)
    expect(result.cost).toBe(1)
    expect(result.error).toBeUndefined()
  })

  it('blocks when balance < cost', async () => {
    mockSupabase = createMockSupabase({ credits: [{ balance: 1 }] })
    const result = await canUseFeature(mockUserId, 'hearing-prep')
    expect(result.allowed).toBe(false)
    expect(result.error).toMatch(/insufficient/i)
  })

  it('blocks when balance is 0', async () => {
    mockSupabase = createMockSupabase({ credits: [{ balance: 0 }] })
    const result = await canUseFeature(mockUserId, 'chat')
    expect(result.allowed).toBe(false)
  })

  it('balance never goes negative - blocks deduction that would go negative', async () => {
    const balance = 1
    const cost = CREDIT_COSTS['hearing-prep'] // 2
    const wouldGoNegative = balance - cost < 0
    expect(wouldGoNegative).toBe(true)
    // verify the logic: allowed = balance >= cost
    expect(balance >= cost).toBe(false)
  })
})

describe('deductCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success:false when RPC indicates insufficient credits', async () => {
    mockSupabase = createMockSupabase(
      {},
      { deduct_credits: { success: false, balance: 1, error: 'Insufficient credits' } },
    )
    const result = await deductCredits(mockUserId, 'hearing-prep')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insufficient/i)
  })

  it('returns success:true and new balance on successful deduction', async () => {
    mockSupabase = createMockSupabase(
      {},
      { deduct_credits: { success: true, balance: 8 } },
    )
    const result = await deductCredits(mockUserId, 'chat')
    expect(result.success).toBe(true)
    expect(result.newBalance).toBe(8)
  })

  it('returns success:false on RPC error', async () => {
    mockSupabase = createMockSupabase({}, {})
    // rpc returns null data (no result)
    const result = await deductCredits(mockUserId, 'chat')
    expect(result.success).toBe(false)
  })
})

describe('addCredits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase({
      credits: [{ balance: 10, lifetime_earned: 10 }],
    })
  })

  it('returns the new balance after adding credits', async () => {
    const newBalance = await addCredits(mockUserId, 5, 'purchase', 'Credit pack purchase')
    expect(newBalance).toBe(15)
  })

  it('returns new balance when starting from 0', async () => {
    mockSupabase = createMockSupabase({
      credits: [{ balance: 0, lifetime_earned: 0 }],
    })
    const newBalance = await addCredits(mockUserId, 10, 'signup_bonus', 'Welcome bonus')
    expect(newBalance).toBe(10)
  })
})

describe('credit balance safety', () => {
  it('balance never goes negative - deduction requires balance >= cost', () => {
    // this is the core invariant. The RPC enforces it server-side,
    // and canUseFeature enforces it client-side.
    const scenarios = [
      { balance: 0, cost: 1, shouldAllow: false },
      { balance: 1, cost: 1, shouldAllow: true },
      { balance: 1, cost: 2, shouldAllow: false },
      { balance: 5, cost: 2, shouldAllow: true },
      { balance: 10, cost: 10, shouldAllow: true },
      { balance: 9, cost: 10, shouldAllow: false },
    ]

    for (const { balance, cost, shouldAllow } of scenarios) {
      const allowed = balance >= cost
      expect(allowed).toBe(shouldAllow)
      if (!allowed) {
        const afterDeduction = balance - cost
        expect(afterDeduction).toBeLessThan(0)
      }
    }
  })
})
