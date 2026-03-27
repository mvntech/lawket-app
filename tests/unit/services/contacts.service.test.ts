import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { createMockContact } from '../../mocks/factories'
import { createMockSupabase, createQueryBuilder } from '../../mocks/supabase'
import type { LocalContact } from '@/lib/db/dexie'

// module mocks

vi.mock('@/lib/db/dexie', () => ({
  db: {
    contacts: {
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
    contactAdded: vi.fn(),
    contactUpdated: vi.fn(),
    contactDeleted: vi.fn(),
    contactLinkedToCase: vi.fn(),
    contactUnlinkedFromCase: vi.fn(),
  },
}))

// helpers

import { db } from '@/lib/db/dexie'

function setupContactsMock(contacts: LocalContact[]) {
  vi.mocked(db.contacts.where).mockReturnValue({
    equals: vi.fn().mockReturnValue({
      filter: vi.fn((fn: (c: LocalContact) => boolean) => ({
        toArray: vi.fn().mockResolvedValue(contacts.filter(fn)),
      })),
      toArray: vi.fn().mockResolvedValue(contacts),
    }),
  } as unknown as ReturnType<typeof db.contacts.where>)

  vi.mocked(db.contacts.filter).mockImplementation((fn: (c: LocalContact) => boolean) => ({
    toArray: vi.fn().mockResolvedValue(contacts.filter(fn)),
  }) as unknown as ReturnType<typeof db.contacts.filter>)

  vi.mocked(db.contacts.get).mockImplementation(
    (id: unknown) => Promise.resolve(contacts.find(c => c.id === id)) as never
  )
  vi.mocked(db.contacts.put).mockImplementation((): never => Promise.resolve('id') as never)
  vi.mocked(db.contacts.update).mockResolvedValue(1)
}

// tests

import { contactsService } from '@/services/contacts.service'

describe('contactsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  // softDelete

  describe('softDelete', () => {
    it('soft deletes the contact record - sets is_deleted: true', async () => {
      const contact = createMockContact({ id: 'contact-del' })
      setupContactsMock([contact])

      await contactsService.softDelete('contact-del')

      // dexie: update with is_deleted: true
      expect(db.contacts.update).toHaveBeenCalledWith(
        'contact-del',
        expect.objectContaining({ is_deleted: true })
      )

      // supabase: contacts table gets .update() NOT .delete()
      const contactsBuilder = mockSupabase.from('contacts')
      expect(contactsBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_deleted: true })
      )
      expect(contactsBuilder.delete).not.toHaveBeenCalled()
    })

    it('hard deletes junction rows in case_contacts - correct behavior', async () => {
      const contact = createMockContact({ id: 'contact-jct' })
      setupContactsMock([contact])

      await contactsService.softDelete('contact-jct')

      // case_contacts: .delete() IS called (junction table has no soft delete)
      const caseContactsBuilder = mockSupabase.from('case_contacts')
      expect(caseContactsBuilder.delete).toHaveBeenCalled()
    })
  })

  // linkToCase

  describe('linkToCase', () => {
    it('inserts into case_contacts table', async () => {
      const contactId = 'contact-123'
      const caseId = 'case-456'

      // mock: no existing link found
      const caseContactsBuilder = {
        ...createQueryBuilder(null),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      }
      mockSupabase.from = vi.fn().mockReturnValue(caseContactsBuilder)

      await contactsService.linkToCase(contactId, caseId)

      expect(caseContactsBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ contact_id: contactId, case_id: caseId })
      )
    })

    it('does not error if contact is already linked', async () => {
      const existingLink = { case_id: 'case-456', contact_id: 'contact-123' }
      const caseContactsBuilder = {
        ...createQueryBuilder([existingLink]),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: existingLink, error: null }),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      }
      mockSupabase.from = vi.fn().mockReturnValue(caseContactsBuilder)

      // should not throw
      await expect(
        contactsService.linkToCase('contact-123', 'case-456')
      ).resolves.not.toThrow()

      // insert should not be called because link already exists
      expect(caseContactsBuilder.insert).not.toHaveBeenCalled()
    })
  })

  // getByCase

  describe('getByCase', () => {
    it('excludes deleted contacts from case result', async () => {
      const activeContact = createMockContact({ id: 'c-active', is_deleted: false })
      const deletedContact = createMockContact({ id: 'c-deleted', is_deleted: true })

      const rows = [
        { contacts: { ...activeContact } },
        { contacts: { ...deletedContact } },
      ]

      const caseContactsBuilder = {
        ...createQueryBuilder(rows),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      }
      mockSupabase.from = vi.fn().mockReturnValue(caseContactsBuilder)
      vi.mocked(db.contacts.put).mockResolvedValue('id')

      const result = await contactsService.getByCase('case-456')

      expect(result.some(c => c.id === 'c-active')).toBe(true)
      expect(result.some(c => c.id === 'c-deleted')).toBe(false)
    })

    it('returns contacts sorted alphabetically by full_name', async () => {
      const zara = createMockContact({ id: 'c-zara', full_name: 'Zara Ahmed', is_deleted: false })
      const ahmad = createMockContact({ id: 'c-ahmad', full_name: 'Ahmad Khan', is_deleted: false })

      const rows = [{ contacts: { ...zara } }, { contacts: { ...ahmad } }]
      const caseContactsBuilder = {
        ...createQueryBuilder(rows),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: rows, error: null }).then(resolve),
      }
      mockSupabase.from = vi.fn().mockReturnValue(caseContactsBuilder)
      vi.mocked(db.contacts.put).mockResolvedValue('id')

      const result = await contactsService.getByCase('case-456')

      // ahmad should come before zara alphabetically
      expect(result[0].full_name).toBe('Ahmad Khan')
      expect(result[1].full_name).toBe('Zara Ahmed')
    })
  })

  // getAll

  describe('getAll', () => {
    it('excludes deleted contacts', async () => {
      const activeContact = createMockContact({ id: 'c-active', is_deleted: false })
      const deletedContact = createMockContact({ id: 'c-del', is_deleted: true })
      setupContactsMock([activeContact, deletedContact])

      const result = await contactsService.getAll('user-test-123')

      expect(result.some(c => c.id === 'c-active')).toBe(true)
      expect(result.some(c => c.id === 'c-del')).toBe(false)
    })
  })
})
