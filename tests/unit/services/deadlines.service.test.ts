import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockDeadline } from '../../mocks/factories'
import { createMockSupabase } from '../../mocks/supabase'
import type { LocalDeadline } from '@/lib/db/dexie'

// module mocks

vi.mock('@/lib/db/dexie', () => ({
  db: {
    cases: {
      where: vi.fn(),
      filter: vi.fn(),
    },
    deadlines: {
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
  analytics: {
    deadlineCompleted: vi.fn(),
  },
}))

// helpers

import { db } from '@/lib/db/dexie'

function setupDeadlinesMock(deadlines: LocalDeadline[]) {
  vi.mocked(db.deadlines.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      filter: vi.fn((fn: (d: LocalDeadline) => boolean) => ({
        toArray: vi.fn().mockResolvedValue(deadlines.filter(fn)),
      })),
      toArray: vi.fn().mockResolvedValue(deadlines),
    }),
  } as unknown as ReturnType<typeof db.deadlines.where>)

  vi.mocked(db.deadlines.filter).mockImplementation((fn: (d: LocalDeadline) => boolean) => ({
    toArray: vi.fn().mockResolvedValue(deadlines.filter(fn)),
  }) as unknown as ReturnType<typeof db.deadlines.filter>)

  vi.mocked(db.deadlines.get).mockImplementation(
    (id: unknown) => Promise.resolve(deadlines.find(d => d.id === id)) as never
  )
  vi.mocked(db.deadlines.put).mockImplementation((): never => Promise.resolve('id') as never)
  vi.mocked(db.deadlines.update).mockResolvedValue(1)

  // cases mock for enrichment
  vi.mocked(db.cases.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      anyOf: vi.fn(() => ({
        filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
        toArray: vi.fn().mockResolvedValue([]),
      })),
      filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
      toArray: vi.fn().mockResolvedValue([]),
    }),
  } as unknown as ReturnType<typeof db.cases.where>)

  vi.mocked(db.cases.filter).mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  } as unknown as ReturnType<typeof db.cases.filter>)
}

// tests

import { deadlinesService } from '@/services/deadlines.service'
import type { DeadlineModel } from '@/services/deadlines.service'

describe('deadlinesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  // getOverdue

  describe('getOverdue', () => {
    it('returns only past-due incomplete deadlines', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      const overdueDeadline = createMockDeadline({
        id: 'd-overdue',
        due_date: yesterdayStr,
        is_completed: false,
      })
      const completedDeadline = createMockDeadline({
        id: 'd-completed',
        due_date: yesterdayStr,
        is_completed: true,
      })
      setupDeadlinesMock([overdueDeadline, completedDeadline])

      const result = await deadlinesService.getOverdue('user-test-123')

      expect(result.some(d => d.id === 'd-overdue')).toBe(true)
      expect(result.some(d => d.id === 'd-completed')).toBe(false)
    })

    it('excludes deleted deadlines from overdue list', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const deletedOverdue = createMockDeadline({
        id: 'd-del-overdue',
        due_date: yesterday.toISOString().split('T')[0],
        is_completed: false,
        is_deleted: true,
      })
      setupDeadlinesMock([deletedOverdue])

      const result = await deadlinesService.getOverdue('user-test-123')

      expect(result.some(d => d.id === 'd-del-overdue')).toBe(false)
    })
  })

  // markComplete

  describe('markComplete', () => {
    it('sets is_completed true and completed_at timestamp', async () => {
      const deadline = createMockDeadline({ id: 'd-mark', is_completed: false })
      setupDeadlinesMock([deadline])
      const before = new Date()

      await deadlinesService.markComplete('d-mark')

      const updateCall = vi.mocked(db.deadlines.update).mock.calls[0]
      const changes = updateCall?.[1] as Partial<LocalDeadline>

      expect(changes.is_completed).toBe(true)
      expect(changes.completed_at).toBeDefined()
      expect(new Date(changes.completed_at as string).getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('does not change title or priority when marking complete', async () => {
      const deadline = createMockDeadline({
        id: 'd-fields',
        title: 'Submit appeal brief',
        priority: 'critical',
      })
      setupDeadlinesMock([deadline])

      await deadlinesService.markComplete('d-fields')

      const updateCall = vi.mocked(db.deadlines.update).mock.calls[0]
      const changes = updateCall?.[1] as Partial<LocalDeadline>

      // title and priority should NOT be in the update payload
      expect(changes.title).toBeUndefined()
      expect(changes.priority).toBeUndefined()
    })
  })

  // getPrioritySorted

  describe('getPrioritySorted', () => {
    it('sorts critical → high → medium → low', () => {
      const deadlines: DeadlineModel[] = [
        createMockDeadline({ id: 'low', priority: 'low' }),
        createMockDeadline({ id: 'critical', priority: 'critical' }),
        createMockDeadline({ id: 'medium', priority: 'medium' }),
        createMockDeadline({ id: 'high', priority: 'high' }),
      ]

      const sorted = deadlinesService.getPrioritySorted(deadlines)

      expect(sorted[0].priority).toBe('critical')
      expect(sorted[1].priority).toBe('high')
      expect(sorted[2].priority).toBe('medium')
      expect(sorted[3].priority).toBe('low')
    })

    it('sorts by due_date within same priority (sooner first)', () => {
      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(today.getDate() + 1)

      const laterHigh = createMockDeadline({
        id: 'later',
        priority: 'high',
        due_date: tomorrow.toISOString().split('T')[0],
      })
      const soonerHigh = createMockDeadline({
        id: 'sooner',
        priority: 'high',
        due_date: today.toISOString().split('T')[0],
      })

      const sorted = deadlinesService.getPrioritySorted([laterHigh, soonerHigh])

      expect(sorted[0].id).toBe('sooner')
    })

    it('is a pure function - does not mutate input array', () => {
      const deadlines: DeadlineModel[] = [
        createMockDeadline({ priority: 'low' }),
        createMockDeadline({ priority: 'high' }),
      ]
      const originalFirst = deadlines[0].priority
      const originalSecond = deadlines[1].priority

      deadlinesService.getPrioritySorted(deadlines)

      expect(deadlines[0].priority).toBe(originalFirst)
      expect(deadlines[1].priority).toBe(originalSecond)
    })
  })

  // softDelete

  describe('softDelete', () => {
    it('NEVER hard deletes - always sets is_deleted: true', async () => {
      const deadline = createMockDeadline({ id: 'd-soft-del' })
      setupDeadlinesMock([deadline])

      await deadlinesService.softDelete('d-soft-del')

      // dexie: update with is_deleted: true
      expect(db.deadlines.update).toHaveBeenCalledWith(
        'd-soft-del',
        expect.objectContaining({ is_deleted: true })
      )

      // supabase: .delete() must NOT be called on deadlines table
      const builder = mockSupabase.from('deadlines')
      expect(builder.delete).not.toHaveBeenCalled()
    })
  })

  // create

  describe('create', () => {
    it('writes to Dexie before Supabase (offline-first)', async () => {
      setupDeadlinesMock([])
      const calls: string[] = []

      vi.mocked(db.deadlines.put).mockImplementation((): never => {
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

      await deadlinesService.create(
        {
          case_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'File response',
          due_date: '2027-03-01',
          priority: 'high',
        },
        'user-test-123'
      )

      expect(calls[0]).toBe('dexie')
      expect(calls[1]).toBe('supabase')
    })

    it('adds to pendingSync queue when offline', async () => {
      setupDeadlinesMock([])
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      await deadlinesService.create(
        {
          case_id: '550e8400-e29b-41d4-a716-446655440000',
          title: 'File response',
          due_date: '2027-03-01',
          priority: 'medium',
        },
        'user-test-123'
      )

      expect(db.pendingSync.add).toHaveBeenCalledWith(
        expect.objectContaining({ operation: 'insert', retry_count: 0 })
      )
    })
  })
})
