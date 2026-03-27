import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockHearing } from '../../mocks/factories'
import { createMockSupabase } from '../../mocks/supabase'
import type { LocalHearing } from '@/lib/db/dexie'

// module mocks

vi.mock('@/lib/db/dexie', () => ({
  db: {
    cases: {
      where: vi.fn(),
      filter: vi.fn(),
    },
    hearings: {
      where: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      filter: vi.fn(),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    pendingSync: {
      add: vi.fn().mockResolvedValue(1),
    },
  },
}))

let mockSupabase = createMockSupabase()

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseClient: vi.fn(() => mockSupabase),
}))

vi.mock('@/lib/analytics', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  captureError: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  analytics: {},
}))

// helpers

import { db } from '@/lib/db/dexie'

function setupHearingsMock(hearings: LocalHearing[]) {
  vi.mocked(db.hearings.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      filter: vi.fn((fn: (h: LocalHearing) => boolean) => ({
        toArray: vi.fn().mockResolvedValue(hearings.filter(fn)),
      })),
      toArray: vi.fn().mockResolvedValue(hearings),
    }),
  } as unknown as ReturnType<typeof db.hearings.where>)

  vi.mocked(db.hearings.filter).mockImplementation((fn: (h: LocalHearing) => boolean) => ({
    toArray: vi.fn().mockResolvedValue(hearings.filter(fn)),
  }) as unknown as ReturnType<typeof db.hearings.filter>)

  vi.mocked(db.hearings.get).mockImplementation(
    (id: unknown) => Promise.resolve(hearings.find(h => h.id === id)) as never
  )
  vi.mocked(db.hearings.put).mockImplementation((): never => Promise.resolve('id') as never)
  vi.mocked(db.hearings.update).mockResolvedValue(1)

  // cases mock for getUpcoming enrichment
  vi.mocked(db.cases.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      toArray: vi.fn().mockResolvedValue([]),
    }),
    anyOf: vi.fn(() => ({
      filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      toArray: vi.fn().mockResolvedValue([]),
    })),
  } as unknown as ReturnType<typeof db.cases.where>)

  vi.mocked(db.cases.filter).mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  } as unknown as ReturnType<typeof db.cases.filter>)
}

// tests

import { hearingsService } from '@/services/hearings.service'

describe('hearingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  // getUpcoming

  describe('getUpcoming', () => {
    it('only returns future hearings - excludes past dates', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const pastHearing = createMockHearing({
        id: 'h-past',
        hearing_date: yesterday.toISOString().split('T')[0],
      })
      const futureHearing = createMockHearing({
        id: 'h-future',
        hearing_date: tomorrow.toISOString().split('T')[0],
      })
      setupHearingsMock([pastHearing, futureHearing])

      const result = await hearingsService.getUpcoming('user-test-123')

      expect(result.some(h => h.id === 'h-future')).toBe(true)
      expect(result.some(h => h.id === 'h-past')).toBe(false)
    })

    it('excludes deleted hearings from upcoming list', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      const deletedHearing = createMockHearing({
        id: 'h-deleted',
        hearing_date: tomorrow.toISOString().split('T')[0],
        is_deleted: true,
      })
      setupHearingsMock([deletedHearing])

      const result = await hearingsService.getUpcoming('user-test-123')

      expect(result.some(h => h.id === 'h-deleted')).toBe(false)
    })

    it('orders hearings by hearing_date ascending', async () => {
      const base = new Date()
      const d1 = new Date(base); d1.setDate(d1.getDate() + 3)
      const d2 = new Date(base); d2.setDate(d2.getDate() + 1)
      const d3 = new Date(base); d3.setDate(d3.getDate() + 5)

      const hearings = [
        createMockHearing({ id: 'h3', hearing_date: d3.toISOString().split('T')[0] }),
        createMockHearing({ id: 'h1', hearing_date: d1.toISOString().split('T')[0] }),
        createMockHearing({ id: 'h2', hearing_date: d2.toISOString().split('T')[0] }),
      ]
      // only include non-deleted, future hearings so the filter passes them
      setupHearingsMock(hearings)

      const result = await hearingsService.getUpcoming('user-test-123')

      const returnedDates = result.map(h => h.hearing_date)
      const sorted = [...returnedDates].sort()
      expect(returnedDates).toEqual(sorted)
    })
  })

  // create

  describe('create', () => {
    it('writes to Dexie before Supabase (offline-first)', async () => {
      setupHearingsMock([])
      const calls: string[] = []

      vi.mocked(db.hearings.put).mockImplementation((): never => {
        calls.push('dexie')
        return Promise.resolve('id') as never
      })
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockImplementation(() => {
          calls.push('supabase')
          return Promise.resolve({ data: null, error: null })
        }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      await hearingsService.create(
        {
          case_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'First hearing',
          hearing_date: '2027-01-15',
        },
        'user-test-123'
      )

      expect(calls[0]).toBe('dexie')
      expect(calls[1]).toBe('supabase')
    })

    it('throws when hearing_date is missing', async () => {
      setupHearingsMock([])

      await expect(
        hearingsService.create(
          {
            case_id: '550e8400-e29b-41d4-a716-446655440000',
            title: 'Test',
            hearing_date: '',
          },
          'user-test-123'
        )
      ).rejects.toThrow()
    })
  })

  // softDelete

  describe('softDelete', () => {
    it('NEVER hard deletes - always sets is_deleted: true', async () => {
      const hearing = createMockHearing({ id: 'h-del' })
      setupHearingsMock([hearing])

      await hearingsService.softDelete('h-del')

      // dexie update with is_deleted: true
      expect(db.hearings.update).toHaveBeenCalledWith(
        'h-del',
        expect.objectContaining({ is_deleted: true })
      )

      // supabase: .delete() must NOT be called on hearings
      const builder = mockSupabase.from('hearings')
      expect(builder.delete).not.toHaveBeenCalled()
    })
  })

  // getByCase

  describe('getByCase', () => {
    it('excludes deleted hearings', async () => {
      const active = createMockHearing({ id: 'h-active', is_deleted: false })
      const deleted = createMockHearing({ id: 'h-deleted', is_deleted: true })
      setupHearingsMock([active, deleted])

      const result = await hearingsService.getByCase('case-test-123')

      expect(result.some(h => h.id === 'h-active')).toBe(true)
      expect(result.some(h => h.id === 'h-deleted')).toBe(false)
    })

    it('orders by hearing_date ascending', async () => {
      const hearings = [
        createMockHearing({ id: 'h1', hearing_date: '2027-03-10', is_deleted: false }),
        createMockHearing({ id: 'h2', hearing_date: '2027-01-05', is_deleted: false }),
        createMockHearing({ id: 'h3', hearing_date: '2027-02-20', is_deleted: false }),
      ]
      setupHearingsMock(hearings)

      const result = await hearingsService.getByCase('case-test-123')

      expect(result[0].hearing_date <= result[1].hearing_date).toBe(true)
      expect(result[1].hearing_date <= result[2].hearing_date).toBe(true)
    })
  })
})
