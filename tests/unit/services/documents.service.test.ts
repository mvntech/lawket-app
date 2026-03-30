import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockSupabase } from '../../mocks/supabase'

// module mocks

vi.mock('@/lib/db/dexie', () => ({
  db: {
    documents: {
      where: vi.fn(),
      get: vi.fn(),
      put: vi.fn(),
      update: vi.fn(),
      filter: vi.fn(),
      bulkPut: vi.fn().mockResolvedValue(undefined),
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
    documentUploaded: vi.fn(),
    documentDeleted: vi.fn(),
  },
}))

// tests

import { documentsService } from '@/services/documents.service'
import { db } from '@/lib/db/dexie'

describe('documentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    vi.mocked(db.documents.put).mockResolvedValue('id')
    vi.mocked(db.documents.update).mockResolvedValue(1)
    vi.mocked(db.documents.get).mockResolvedValue(undefined)
    vi.mocked(db.documents.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        filter: vi.fn(() => ({ toArray: vi.fn().mockResolvedValue([]) })),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as ReturnType<typeof db.documents.where>)
    vi.mocked(db.documents.filter).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof db.documents.filter>)
  })

  // upload

  describe('upload', () => {
    it('rejects files that exceed 50MB limit', async () => {
      const bigFile = new File(
        [new ArrayBuffer(60 * 1024 * 1024)],
        'big-file.pdf',
        { type: 'application/pdf' }
      )

      await expect(
        documentsService.upload(bigFile, 'case-123', 'user-123', { name: 'Big File' })
      ).rejects.toThrow(/50MB|exceeds/)

      // storage upload must not be called
      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('rejects unsupported file types', async () => {
      const wrongFile = new File(
        ['malicious content'],
        'virus.exe',
        { type: 'application/exe' }
      )

      await expect(
        documentsService.upload(wrongFile, 'case-123', 'user-123', { name: 'Virus' })
      ).rejects.toThrow(/not supported|type/)

      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('uses correct storage path format: userId/caseId/timestamp_name', async () => {
      const file = new File(['content'], 'contract.pdf', { type: 'application/pdf' })
      const userId = 'user-abc'
      const caseId = 'case-xyz'

      let capturedPath = ''
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockImplementation((path: string) => {
          capturedPath = path
          return Promise.resolve({ data: { path }, error: null })
        }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://mock.url' },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })

      // mock db insert success
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      await documentsService.upload(file, caseId, userId, { name: 'Contract' })

      // path must be: userId/caseId/timestamp_filename
      expect(capturedPath).toMatch(new RegExp(`^${userId}/${caseId}/\\d+_`))
    })

    it('sanitizes filename: removes spaces and special chars', async () => {
      const file = new File(['content'], 'My Document (1).pdf', { type: 'application/pdf' })

      let capturedPath = ''
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockImplementation((path: string) => {
          capturedPath = path
          return Promise.resolve({ data: { path }, error: null })
        }),
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://mock.url' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      await documentsService.upload(file, 'case-123', 'user-123', { name: 'My Document' })

      const filename = capturedPath.split('/').pop() ?? ''
      // should not contain spaces or parentheses
      expect(filename).not.toContain(' ')
      expect(filename).not.toContain('(')
      expect(filename).not.toContain(')')
      // should be lowercase
      expect(filename).toBe(filename.toLowerCase())
    })

    it('cleans up storage when DB insert fails', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(123)
      const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
      const storagePath = 'user-123/case-123/123_document.pdf'
      const removeMock = vi.fn().mockResolvedValue({ error: null })

      mockSupabase.storage.from = vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: storagePath }, error: null }),
        remove: removeMock,
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://mock.url' }, error: null }),
      })
      mockSupabase.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error', code: '42P01' } }),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: { message: 'DB error' } }).then(resolve),
      })

      await expect(
        documentsService.upload(file, 'case-123', 'user-123', { name: 'Document' })
      ).rejects.toThrow()

      // storage remove must be called to clean up the orphaned file
      expect(removeMock).toHaveBeenCalledWith([storagePath])
    })
  })

  // upload — metadata validation

  describe('upload (metadata validation)', () => {
    it('rejects metadata.name that is empty', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

      await expect(
        documentsService.upload(file, 'case-123', 'user-123', { name: '' })
      ).rejects.toThrow(/name|required|metadata/i)

      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('rejects metadata.name exceeding 200 chars', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

      await expect(
        documentsService.upload(file, 'case-123', 'user-123', { name: 'A'.repeat(201) })
      ).rejects.toThrow(/name|long|metadata/i)

      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('rejects invalid doc_type value', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

      await expect(
        documentsService.upload(file, 'case-123', 'user-123', {
          name: 'Valid Name',
          doc_type: 'invalid_type' as never,
        })
      ).rejects.toThrow()

      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('rejects notes exceeding 2000 chars', async () => {
      const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

      await expect(
        documentsService.upload(file, 'case-123', 'user-123', {
          name: 'Valid Name',
          notes: 'N'.repeat(2001),
        })
      ).rejects.toThrow()

      expect(mockSupabase.storage.from).not.toHaveBeenCalled()
    })

    it('accepts all valid doc_type enum values', async () => {
      const validTypes = ['petition', 'affidavit', 'evidence', 'order', 'judgment', 'correspondence', 'contract', 'other'] as const

      for (const doc_type of validTypes) {
        const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })

        mockSupabase.storage.from = vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ data: { path: 'p' }, error: null }),
          createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://mock.url' }, error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })
        mockSupabase.from = vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: (v: unknown) => unknown) =>
            Promise.resolve({ data: null, error: null }).then(resolve),
        })

        await expect(
          documentsService.upload(file, 'case-123', 'user-123', { name: 'Doc', doc_type })
        ).resolves.toBeDefined()
      }
    })
  })

  // updateDocType — validation

  describe('updateDocType', () => {
    it('rejects invalid doc_type string', async () => {
      await expect(
        documentsService.updateDocType('doc-123', 'invalid_type' as never)
      ).rejects.toThrow()

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('accepts valid doc_type and calls db update', async () => {
      await documentsService.updateDocType('doc-123', 'affidavit')

      expect(vi.mocked(db.documents.update)).toHaveBeenCalledWith(
        'doc-123',
        expect.objectContaining({ doc_type: 'affidavit' }),
      )
    })
  })

  // getSignedUrl

  describe('getSignedUrl', () => {
    it('caches signed URL - Supabase called only once for the same path', async () => {
      const filePath = 'user-123/case-456/123_contract.pdf'
      const createSignedUrlMock = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://mock-signed-url.supabase.co/file.pdf?token=abc' },
        error: null,
      })
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        createSignedUrl: createSignedUrlMock,
      })

      // call twice
      await documentsService.getSignedUrl(filePath)
      await documentsService.getSignedUrl(filePath)

      // should only call supabase once (cached on second call)
      expect(createSignedUrlMock).toHaveBeenCalledTimes(1)
    })

    it('never returns a simple public URL - always a signed URL with token', async () => {
      const filePath = 'user-123/case-456/doc.pdf'
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: 'https://mock.supabase.co/storage/v1/object/sign/file.pdf?token=abc123' },
          error: null,
        }),
      })

      const url = await documentsService.getSignedUrl(filePath)

      // must contain a token or signedUrl indicator
      expect(url).toMatch(/token|sign/)
    })
  })

  // softDelete

  describe('softDelete', () => {
    it('sets is_deleted true in DB only - file remains in storage', async () => {
      vi.mocked(db.documents.get).mockResolvedValue({ id: 'doc-123', user_id: 'user-123' } as any)
      const removeMock = vi.fn()
      mockSupabase.storage.from = vi.fn().mockReturnValue({
        remove: removeMock,
        createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://mock.url' }, error: null }),
      })

      mockSupabase.from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      })

      await documentsService.softDelete('doc-123', 'user-123/case-123/file.pdf')

      // db update with is_deleted: true
      const docsBuilder = mockSupabase.from('documents')
      expect(docsBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_deleted: true })
      )

      // storage remove must not be called - file stays in storage
      expect(removeMock).not.toHaveBeenCalled()
    })
  })
})
