import { describe, it, expect, vi, beforeEach } from 'vitest'

// supabase mock

const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockGte = vi.fn()
const mockInsert = vi.fn()

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(async () => ({
    from: mockFrom,
  })),
}))

// helpers

function makeCountChain(count: number) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ count, error: null }),
      }),
    }),
    insert: vi.fn().mockResolvedValue({ error: null }),
  }
}

// tests

import { checkRateLimit, trackUsage } from '@/lib/ai/rate-limiter'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows request when usage is below daily limit (0 used)', async () => {
    mockFrom.mockReturnValue(makeCountChain(0))

    const result = await checkRateLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(20)
  })

  it('allows request when usage is 19 (one below limit)', async () => {
    mockFrom.mockReturnValue(makeCountChain(19))

    const result = await checkRateLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(1)
  })

  it('blocks request when usage equals daily limit (20)', async () => {
    mockFrom.mockReturnValue(makeCountChain(20))

    const result = await checkRateLimit('user-123')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('blocks request when usage exceeds daily limit', async () => {
    mockFrom.mockReturnValue(makeCountChain(25))

    const result = await checkRateLimit('user-123')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('handles null count from Supabase as 0 (treats as no usage)', async () => {
    mockFrom.mockReturnValue(makeCountChain(null as unknown as number))

    const result = await checkRateLimit('user-123')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(20)
  })

  it('resetAt is midnight UTC of the next day, not now + 1h', async () => {
    mockFrom.mockReturnValue(makeCountChain(0))

    const before = new Date()
    const result = await checkRateLimit('user-123')
    const after = new Date()

    const resetAt = result.resetAt
    const resetMs = resetAt.getTime()

    // must be strictly after the current time (future midnight)
    expect(resetMs).toBeGreaterThan(before.getTime())

    // must be within the next 24 hours
    expect(resetMs).toBeLessThanOrEqual(after.getTime() + 24 * 60 * 60 * 1000)

    // must be exactly midnight UTC (seconds, minutes, hours all zero)
    expect(resetAt.getUTCHours()).toBe(0)
    expect(resetAt.getUTCMinutes()).toBe(0)
    expect(resetAt.getUTCSeconds()).toBe(0)
    expect(resetAt.getUTCMilliseconds()).toBe(0)
  })

  it('queries by today UTC start, not a rolling 1-hour window', async () => {
    const gteMock = vi.fn().mockResolvedValue({ count: 0, error: null })
    const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ select: selectMock })

    await checkRateLimit('user-123')

    expect(gteMock).toHaveBeenCalledOnce()

    // the date passed to gte must be today's UTC midnight, not 1 hour ago
    const passedDate = gteMock.mock.calls[0][1] as string
    const parsed = new Date(passedDate)

    expect(parsed.getUTCHours()).toBe(0)
    expect(parsed.getUTCMinutes()).toBe(0)
    expect(parsed.getUTCSeconds()).toBe(0)

    // must not be within the last hour (ruling out rolling-window implementation)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    expect(parsed.getTime()).toBeLessThan(oneHourAgo)
  })
})

describe('trackUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts a row with userId, feature, and tokensUsed', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: insertMock })

    await trackUsage('user-abc', 'case-summary', 800)

    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-abc',
      feature: 'case-summary',
      tokens_used: 800,
    })
  })

  it('tracks zero tokens when AI response is empty', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert: insertMock })

    await trackUsage('user-xyz', 'clean-notes', 0)

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ tokens_used: 0 }),
    )
  })
})
