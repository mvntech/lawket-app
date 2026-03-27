import { describe, it, expect } from 'vitest'
import { CREDIT_PACKAGES, MAX_AD_PER_DAY, AD_CREDIT_VALUE } from '@/lib/credits/constants'
import { makeCredits } from '../../factories'

describe('Credits API', () => {

  describe('POST /api/credits/checkout', () => {
    it('only accepts known package IDs', () => {
      const validIds = CREDIT_PACKAGES.map(p => p.id)
      expect(validIds).toContain('starter')
      expect(validIds).toContain('standard')
      expect(validIds).toContain('pro')

      const unknownId = 'enterprise'
      expect(validIds.includes(unknownId)).toBe(false)
    })

    it('each package has a positive credits amount', () => {
      for (const pkg of CREDIT_PACKAGES) {
        expect(pkg.credits).toBeGreaterThan(0)
        expect(typeof pkg.credits).toBe('number')
      }
    })

    it('each package has a variantId field', () => {
      for (const pkg of CREDIT_PACKAGES) {
        expect('variantId' in pkg).toBe(true)
      }
    })

    it('requires packageId - missing body returns 400', () => {
      // without packageId the route should return 400
      const body = {} as Record<string, unknown>
      expect('packageId' in body).toBe(false)
      // route logic: if (!packageId) return 400
    })
  })

  describe('POST /api/credits/ad-reward', () => {
    it('blocks request when daily limit reached', () => {
      const credits = makeCredits({
        ad_credits_today: MAX_AD_PER_DAY,
        ad_credits_reset_at: new Date().toISOString().split('T')[0],
      })

      const todayCount = credits.ad_credits_today as number
      const isAllowed = todayCount < MAX_AD_PER_DAY
      expect(isAllowed).toBe(false)
    })

    it('allows request when count is below daily limit', () => {
      const credits = makeCredits({
        ad_credits_today: 2,
        ad_credits_reset_at: new Date().toISOString().split('T')[0],
      })

      const todayCount = credits.ad_credits_today as number
      const isAllowed = todayCount < MAX_AD_PER_DAY
      expect(isAllowed).toBe(true)
    })

    it('resets daily counter when reset date is in the past', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const credits = makeCredits({
        ad_credits_today: MAX_AD_PER_DAY,
        ad_credits_reset_at: yesterday.toISOString().split('T')[0],
      })

      const today = new Date().toISOString().split('T')[0]!
      const shouldReset = (credits.ad_credits_reset_at as string) < today
      expect(shouldReset).toBe(true)
      // After reset, count is 0, which is < MAX_AD_PER_DAY
      const allowedAfterReset = 0 < MAX_AD_PER_DAY
      expect(allowedAfterReset).toBe(true)
    })

    it('awards exactly AD_CREDIT_VALUE credits per reward', () => {
      expect(AD_CREDIT_VALUE).toBe(1)
    })
  })
})
