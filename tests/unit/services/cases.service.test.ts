import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockCase } from '../../mocks/factories'
import { createMockSupabase } from '../../mocks/supabase'
import type { LocalCase } from '@/lib/db/dexie'

// module mocks

const mockCasesData: LocalCase[] = []
const mockPendingSyncData: unknown[] = []

vi.mock('@/lib/db/dexie', () => ({
  db: {
    cases: {
      where: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      filter: vi.fn(),
      bulkPut: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    pendingSync: {
      add: vi.fn(),
      orderBy: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      clear: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn(),
      toArray: vi.fn(),
    },
    hearings: { clear: vi.fn().mockResolvedValue(undefined) },
    deadlines: { clear: vi.fn().mockResolvedValue(undefined) },
    contacts: { clear: vi.fn().mockResolvedValue(undefined) },
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
    caseCreated: vi.fn(),
    caseUpdated: vi.fn(),
    caseDeleted: vi.fn(),
    deadlineCompleted: vi.fn(),
    contactAdded: vi.fn(),
    contactUpdated: vi.fn(),
    contactDeleted: vi.fn(),
    contactLinkedToCase: vi.fn(),
    contactUnlinkedFromCase: vi.fn(),
    documentUploaded: vi.fn(),
    documentDeleted: vi.fn(),
  },
}))

// helpers

import { db } from '@/lib/db/dexie'

function setupCasesMock(cases: LocalCase[], dirtyFilter: LocalCase[] = []) {
  // where().equals().filter().toArray()
  vi.mocked(db.cases.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      filter: vi.fn((fn: (c: LocalCase) => boolean) => ({
        toArray: vi.fn().mockResolvedValue(cases.filter(fn)),
      })),
      toArray: vi.fn().mockResolvedValue(cases),
      anyOf: vi.fn((ids: string[]) => ({
        filter: vi.fn((fn: (c: LocalCase) => boolean) => ({
          toArray: vi.fn().mockResolvedValue(
            cases.filter(c => ids.includes(c.id)).filter(fn)
          ),
        })),
        toArray: vi.fn().mockResolvedValue(cases.filter(c => ids.includes(c.id))),
      })),
    }),
  } as unknown as ReturnType<typeof db.cases.where>)

  vi.mocked(db.cases.filter).mockImplementation((fn: (c: LocalCase) => boolean) => ({
    toArray: vi.fn().mockResolvedValue(dirtyFilter.filter(fn)),
  }) as unknown as ReturnType<typeof db.cases.filter>)

  vi.mocked(db.cases.get).mockImplementation(
    (id: unknown) => Promise.resolve(cases.find(c => c.id === id)) as never
  )
  vi.mocked(db.cases.put).mockImplementation((item: LocalCase) => {
    const idx = mockCasesData.findIndex(c => c.id === item.id)
    if (idx >= 0) mockCasesData[idx] = item
    else mockCasesData.push(item)
    return Promise.resolve(item.id) as never
  })
  vi.mocked(db.cases.update).mockResolvedValue(1)
  vi.mocked(db.pendingSync.add).mockResolvedValue(1)
}

// tests

import { casesService } from '@/services/cases.service'

describe('casesService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCasesData.length = 0
    mockPendingSyncData.length = 0
    mockSupabase = createMockSupabase()
    // Default: online
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  // getAll

  describe('getAll', () => {
    it('returns cases from Dexie first without calling Supabase', async () => {
      const mockCase = createMockCase()
      setupCasesMock([mockCase])

      const result = await casesService.getAll('user-test-123')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(mockCase.id)
      expect(db.cases.where).toHaveBeenCalledWith('user_id')
    })

    it('filters out soft-deleted cases', async () => {
      const deletedCase = createMockCase({ is_deleted: true })
      const activeCase = createMockCase({ is_deleted: false })
      setupCasesMock([deletedCase, activeCase])

      const result = await casesService.getAll('user-test-123')

      // The filter fn passed to Dexie filters out is_deleted=true
      const ids = result.map(c => c.id)
      expect(ids).not.toContain(deletedCase.id)
      expect(ids).toContain(activeCase.id)
    })

    it('paginates results - page 0 returns first 20', async () => {
      const cases = Array.from({ length: 25 }, (_, i) =>
        createMockCase({ id: `case-${i}`, updated_at: new Date(i * 1000).toISOString() })
      )
      setupCasesMock(cases.filter(c => !c.is_deleted))

      const result = await casesService.getAll('user-test-123', { page: 0, pageSize: 20 })

      expect(result).toHaveLength(20)
    })

    it('paginates results - page 1 returns remaining 5', async () => {
      const cases = Array.from({ length: 25 }, (_, i) =>
        createMockCase({ id: `case-${i}`, updated_at: new Date(i * 1000).toISOString() })
      )
      setupCasesMock(cases.filter(c => !c.is_deleted))

      const result = await casesService.getAll('user-test-123', { page: 1, pageSize: 20 })

      expect(result).toHaveLength(5)
    })

    it('filters by status when provided', async () => {
      const activeCase1 = createMockCase({ id: 'c1', status: 'active' })
      const activeCase2 = createMockCase({ id: 'c2', status: 'active' })
      const pendingCase = createMockCase({ id: 'c3', status: 'pending' })
      setupCasesMock([activeCase1, activeCase2, pendingCase])

      const result = await casesService.getAll('user-test-123', { status: 'active' })

      expect(result.every(c => c.status === 'active')).toBe(true)
      expect(result.some(c => c.id === 'c3')).toBe(false)
    })

    it('searches by title and client name', async () => {
      const ahmadCase = createMockCase({
        id: 'c-ahmad',
        title: 'Ahmad v. State',
        client_name: 'Tariq Ahmad',
      })
      const khanCase = createMockCase({
        id: 'c-khan',
        title: 'Khan v. State',
        client_name: 'Bilal Khan',
      })
      setupCasesMock([ahmadCase, khanCase])

      const result = await casesService.getAll('user-test-123', { search: 'Ahmad' })

      expect(result.some(c => c.id === 'c-ahmad')).toBe(true)
      expect(result.some(c => c.id === 'c-khan')).toBe(false)
    })
  })

  // create

  describe('create', () => {
    it('writes to Dexie before Supabase (offline-first order)', async () => {
      setupCasesMock([])
      const calls: string[] = []
      vi.mocked(db.cases.put).mockImplementation((): never => {
        calls.push('dexie')
        return Promise.resolve('id') as never
      })
      const fromBuilder = {
        insert: vi.fn().mockImplementation(() => {
          calls.push('supabase')
          return Promise.resolve({ data: null, error: null })
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      }
      mockSupabase.from = vi.fn().mockReturnValue(fromBuilder)

      await casesService.create(
        { case_number: 'CR-001', title: 'Test Case', client_name: 'Ahmad', case_type: 'civil', status: 'active' },
        'user-test-123'
      )

      expect(calls[0]).toBe('dexie')
      expect(calls[1]).toBe('supabase')
    })

    it('sets _dirty true and _synced false on the record before sync', async () => {
      setupCasesMock([])
      let capturedItem: LocalCase | null = null
      vi.mocked(db.cases.put).mockImplementation((item: LocalCase): never => {
        capturedItem = { ...item }  // snapshot - service mutates the original after Supabase succeeds
        return Promise.resolve(item.id) as never
      })
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      await casesService.create(
        { case_number: 'CR-001', title: 'Test Case', client_name: 'Ahmad', case_type: 'civil', status: 'active' },
        'user-test-123'
      )

      expect(capturedItem!._dirty).toBe(true)
      expect(capturedItem!._synced).toBe(false)
    })

    it('marks _dirty false after successful Supabase write', async () => {
      setupCasesMock([])
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      const result = await casesService.create(
        { case_number: 'CR-001', title: 'Test Case', client_name: 'Ahmad', case_type: 'civil', status: 'active' },
        'user-test-123'
      )

      // db.cases.update should be called with _dirty: false after successful sync
      expect(db.cases.update).toHaveBeenCalledWith(
        result.id,
        expect.objectContaining({ _dirty: false, _synced: true })
      )
    })

    it('adds to pendingSync queue when offline', async () => {
      setupCasesMock([])
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      await casesService.create(
        { case_number: 'CR-001', title: 'Test Case', client_name: 'Ahmad', case_type: 'civil', status: 'active' },
        'user-test-123'
      )

      expect(db.pendingSync.add).toHaveBeenCalledWith(
        expect.objectContaining({
          table_name: expect.stringContaining('cases'),
          operation: 'insert',
          retry_count: 0,
        })
      )
      // supabase insert NOT called
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('rejects when title is empty - Zod validation', async () => {
      setupCasesMock([])

      await expect(
        casesService.create(
          { case_number: 'CR-001', title: '', client_name: 'Ahmad', case_type: 'civil', status: 'active' },
          'user-test-123'
        )
      ).rejects.toThrow()

      expect(db.cases.put).not.toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  // softDelete

  describe('softDelete', () => {
    it('sets is_deleted true - NEVER hard deletes', async () => {
      const mockCase = createMockCase({ id: 'case-del-1' })
      setupCasesMock([mockCase])

      await casesService.softDelete('case-del-1', 'user-test-123')

      // dexie: update with is_deleted: true
      expect(db.cases.update).toHaveBeenCalledWith(
        'case-del-1',
        expect.objectContaining({ is_deleted: true })
      )

      // supabase: .update() called, NOT .delete()
      const fromCall = mockSupabase.from.mock.calls.find(([t]) => t === 'cases')
      expect(fromCall).toBeDefined()
      const builder = mockSupabase.from('cases')
      // delete() must NEVER be called on cases table
      expect(builder.delete).not.toHaveBeenCalled()
    })

    it('sets deleted_at timestamp on soft delete', async () => {
      const mockCase = createMockCase({ id: 'case-del-2' })
      setupCasesMock([mockCase])
      const before = new Date()

      await casesService.softDelete('case-del-2', 'user-test-123')

      const updateCall = vi.mocked(db.cases.update).mock.calls[0]
      const changes = updateCall?.[1] as Partial<LocalCase>
      expect(changes.is_deleted).toBe(true)
      expect(changes.deleted_at).toBeDefined()

      const deletedAt = new Date(changes.deleted_at as string)
      expect(deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })

    it('sets deleted_by to userId in Supabase update', async () => {
      const mockCase = createMockCase({ id: 'case-del-3' })
      setupCasesMock([mockCase])
      const userId = 'user-test-123'

      await casesService.softDelete('case-del-3', userId)

      // find the supabase update call for cases table
      const updateBuilder = mockSupabase.from('cases')
      expect(updateBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_by: userId })
      )
    })
  })

  // getById

  describe('getById', () => {
    it('returns null for deleted cases', async () => {
      const deletedCase = createMockCase({ id: 'case-gone', is_deleted: true })
      setupCasesMock([deletedCase])

      const result = await casesService.getById('case-gone')

      expect(result).toBeNull()
    })

    it('returns the case when found in Dexie', async () => {
      const mockCase = createMockCase({ id: 'case-found', is_deleted: false })
      setupCasesMock([mockCase])

      const result = await casesService.getById('case-found')

      expect(result?.id).toBe('case-found')
    })
  })

  // getStats

  describe('getStats', () => {
    it('returns correct counts by status', async () => {
      const cases = [
        createMockCase({ id: 'a1', status: 'active' }),
        createMockCase({ id: 'a2', status: 'active' }),
        createMockCase({ id: 'p1', status: 'pending' }),
        createMockCase({ id: 'cl1', status: 'closed' }),
      ]
      setupCasesMock(cases)

      const stats = await casesService.getStats('user-test-123', true)

      expect(stats.active).toBe(2)
      expect(stats.pending).toBe(1)
      expect(stats.closed).toBe(1)
      expect(stats.total).toBe(4)
    })

    it('excludes deleted cases from stats', async () => {
      const cases = [
        createMockCase({ id: 'a1', status: 'active' }),
        createMockCase({ id: 'a2', status: 'active', is_deleted: true }),
      ]
      // filter out deleted before passing to mock (simulating Dexie's filter)
      setupCasesMock(cases.filter(c => !c.is_deleted))

      const stats = await casesService.getStats('user-test-123', true)

      expect(stats.active).toBe(1)
      expect(stats.total).toBe(1)
    })
  })
})
