import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase } from '../../mocks/supabase'

// module mocks

const mockPendingOps: Array<{
  id?: number
  table_name: string
  operation: string
  record_id: string
  payload: string
  created_at: string
  retry_count: number
}> = []

vi.mock('@/lib/db/dexie', () => ({
  db: {
    pendingSync: {
      add: vi.fn().mockImplementation((item) => {
        const id = mockPendingOps.length + 1
        mockPendingOps.push({ ...item, id })
        return Promise.resolve(id)
      }),
      orderBy: vi.fn().mockReturnValue({
        toArray: vi.fn().mockImplementation(() => Promise.resolve([...mockPendingOps])),
      }),
      delete: vi.fn().mockImplementation((id) => {
        const idx = mockPendingOps.findIndex(o => o.id === id)
        if (idx >= 0) mockPendingOps.splice(idx, 1)
        return Promise.resolve()
      }),
      update: vi.fn().mockImplementation((id, changes) => {
        const op = mockPendingOps.find(o => o.id === id)
        if (op) Object.assign(op, changes)
        return Promise.resolve(1)
      }),
      count: vi.fn().mockImplementation(() => Promise.resolve(mockPendingOps.length)),
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

// tests

import { addToQueue, flushQueue } from '@/lib/db/sync/write-queue'
import { resolveConflict } from '@/lib/db/sync/conflict-resolver'
import { db } from '@/lib/db/dexie'

describe('Write Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPendingOps.length = 0
    mockSupabase = createMockSupabase()
  })

  // addToQueue

  describe('addToQueue', () => {
    it('adds operation to pendingSync with retry_count 0', async () => {
      await addToQueue('cases', 'insert', 'case-123', { title: 'Test Case' })

      expect(db.pendingSync.add).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: 'cases',
          operation: 'insert',
          record_id: 'case-123',
          retry_count: 0,
        })
      )
    })

    it('serializes payload as JSON string', async () => {
      const payload = { title: 'Ahmad v. State', client_name: 'Tariq Ahmad' }

      await addToQueue('cases', 'update', 'case-456', payload)

      const addCall = vi.mocked(db.pendingSync.add).mock.calls[0]
      const addedItem = addCall?.[0] as { payload: string }
      expect(JSON.parse(addedItem.payload)).toEqual(payload)
    })
  })

  // flushQueue

  describe('flushQueue', () => {
    it('processes pending operations in order (FIFO)', async () => {
      const processedIds: string[] = []

      // add two operations
      mockPendingOps.push({
        id: 1,
        table_name: 'cases',
        operation: 'insert',
        record_id: 'case-1',
        payload: JSON.stringify({ id: 'case-1', title: 'First' }),
        created_at: new Date().toISOString(),
        retry_count: 0,
      })
      mockPendingOps.push({
        id: 2,
        table_name: 'cases',
        operation: 'insert',
        record_id: 'case-2',
        payload: JSON.stringify({ id: 'case-2', title: 'Second' }),
        created_at: new Date().toISOString(),
        retry_count: 0,
      })

      mockSupabase.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockImplementation((payload: { id: string }) => {
          processedIds.push(payload.id)
          return Promise.resolve({ data: null, error: null })
        }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      vi.mocked(db.pendingSync.orderBy).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([...mockPendingOps]),
      } as unknown as ReturnType<typeof db.pendingSync.orderBy>)

      await flushQueue()

      expect(processedIds[0]).toBe('case-1')
      expect(processedIds[1]).toBe('case-2')
    })

    it('deletes operation from queue after successful sync', async () => {
      mockPendingOps.push({
        id: 1,
        table_name: 'cases',
        operation: 'insert',
        record_id: 'case-1',
        payload: JSON.stringify({ id: 'case-1' }),
        created_at: new Date().toISOString(),
        retry_count: 0,
      })

      mockSupabase.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      vi.mocked(db.pendingSync.orderBy).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([...mockPendingOps]),
      } as unknown as ReturnType<typeof db.pendingSync.orderBy>)

      await flushQueue()

      expect(db.pendingSync.delete).toHaveBeenCalledWith(1)
    })

    it('increments retry_count on failure - does not delete', async () => {
      mockPendingOps.push({
        id: 1,
        table_name: 'cases',
        operation: 'insert',
        record_id: 'case-fail',
        payload: JSON.stringify({ id: 'case-fail' }),
        created_at: new Date().toISOString(),
        retry_count: 0,
      })

      mockSupabase.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'Network error' } }).then(resolve),
      })

      vi.mocked(db.pendingSync.orderBy).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([...mockPendingOps]),
      } as unknown as ReturnType<typeof db.pendingSync.orderBy>)

      await flushQueue()

      // retry_count incremented to 1
      expect(db.pendingSync.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ retry_count: 1 })
      )
      // not deleted
      expect(db.pendingSync.delete).not.toHaveBeenCalled()
    })

    it('removes op permanently after 5 failed retries', async () => {
      const { captureException } = await import('@/lib/analytics')

      mockPendingOps.push({
        id: 1,
        table_name: 'cases',
        operation: 'insert',
        record_id: 'case-max-retry',
        payload: JSON.stringify({ id: 'case-max-retry' }),
        created_at: new Date().toISOString(),
        retry_count: 5, // already at max
      })

      mockSupabase.from = vi.fn().mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ data: null, error: { message: 'Permanent error' } }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'Permanent error' } }).then(resolve),
      })

      vi.mocked(db.pendingSync.orderBy).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([...mockPendingOps]),
      } as unknown as ReturnType<typeof db.pendingSync.orderBy>)

      await flushQueue()

      // should be deleted after max retries
      expect(db.pendingSync.delete).toHaveBeenCalledWith(1)
      // error captured to sentry
      expect(captureException).toHaveBeenCalled()
    })

    it('does nothing when queue is empty', async () => {
      vi.mocked(db.pendingSync.orderBy).mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof db.pendingSync.orderBy>)

      await flushQueue()

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })
})

// conflict resolver

describe('Conflict Resolver', () => {
  it('picks remote when remote updated_at is newer', () => {
    const local = { id: 'rec-1', updated_at: '2024-01-01T10:00:00Z' }
    const remote = { id: 'rec-1', updated_at: '2024-01-01T11:00:00Z' }

    const result = resolveConflict(local, remote)

    expect(result).toBe('remote')
  })

  it('picks local when local updated_at is newer', () => {
    const local = { id: 'rec-2', updated_at: '2024-01-01T12:00:00Z' }
    const remote = { id: 'rec-2', updated_at: '2024-01-01T11:00:00Z' }

    const result = resolveConflict(local, remote)

    expect(result).toBe('local')
  })

  it('picks remote on equal timestamps (remote wins tie)', () => {
    const ts = '2024-01-01T10:00:00Z'

    const result = resolveConflict(
      { id: 'rec-3', updated_at: ts },
      { id: 'rec-3', updated_at: ts }
    )

    expect(result).toBe('remote')
  })
})
