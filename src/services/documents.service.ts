import { db } from '@/lib/db/dexie'
import type { LocalDocument } from '@/lib/db/dexie'
import { getSupabaseClient } from '@/lib/supabase/client'
import { createTableHelper } from '@/lib/db/service-utils'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { STORAGE_BUCKET, SIGNED_URL_EXPIRY_SECONDS } from '@/lib/constants/app'
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from '@/lib/constants/app'
import { logger, captureError, analytics } from '@/lib/analytics'
import { DatabaseError, StorageError } from '@/types/common.types'
import { formatFileSize } from '@/lib/utils/format'
import type { DocumentType } from '@/types/database.types'

// types

export type DocumentModel = LocalDocument

export interface UploadDocumentInput {
  name: string
  doc_type?: DocumentType
  notes?: string
}

const docsFrom = createTableHelper(DB_TABLES.documents)

// signed url cache

const SIGNED_URL_CACHE_MS = 55 * 60 * 1000 // 55 minutes

interface CachedUrl {
  url: string
  expiresAt: number
}

const signedUrlCache = new Map<string, CachedUrl>()

// staleness tracking

const lastFetchedAt = new Map<string, number>()
const STALE_MS = 1000 * 60 * 5

function isStale(key: string): boolean {
  const t = lastFetchedAt.get(key)
  return !t || Date.now() - t > STALE_MS
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// converters

function toLocalDocument(row: {
  id: string
  case_id: string
  user_id: string
  name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  doc_type: DocumentType
  notes: string | null
  is_deleted: boolean
  deleted_at: string | null
  created_at: string
}): LocalDocument {
  return {
    id: row.id,
    case_id: row.case_id,
    user_id: row.user_id,
    name: row.name,
    file_path: row.file_path,
    file_size: row.file_size,
    mime_type: row.mime_type,
    doc_type: row.doc_type,
    notes: row.notes,
    is_deleted: row.is_deleted,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    _synced: true,
  }
}

// background refresh

async function refreshByCaseFromSupabase(caseId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await docsFrom(supabase)
    .select('*')
    .eq('case_id', caseId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })

  if (error) throw new DatabaseError('Failed to refresh documents', error)
  if (data) {
    // do not overwrite documents with unsynced local changes (e.g. a pending soft-delete)
    const unsyncedIds = new Set(
      (await db.documents.filter((d) => !d._synced).toArray()).map((d) => d.id),
    )
    const toUpsert = (data as Parameters<typeof toLocalDocument>[0][])
      .filter((d) => !unsyncedIds.has(d.id))
      .map(toLocalDocument)
    await db.documents.bulkPut(toUpsert)
    lastFetchedAt.set(caseId, Date.now())
  }
}

// service

export const documentsService = {
  async getByCase(caseId: string): Promise<DocumentModel[]> {
    try {
      const docs = await db.documents
        .where('case_id')
        .equals(caseId)
        .filter((d) => !d.is_deleted)
        .toArray()

      docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (isOnline() && isStale(caseId)) {
        refreshByCaseFromSupabase(caseId).catch((err) => {
          logger.error({ err, caseId }, 'documentsService background refresh failed')
        })
      }

      return docs
    } catch (err) {
      logger.error({ err, caseId }, 'documentsService.getByCase failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch documents', err)
    }
  },

  async getById(id: string): Promise<DocumentModel | null> {
    try {
      const local = await db.documents.get(id)
      if (local && !local.is_deleted) return local

      if (!isOnline()) return null

      const supabase = getSupabaseClient()
      const { data, error } = await docsFrom(supabase)
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle()

      if (error) throw new DatabaseError('Failed to fetch document', error)
      if (!data) return null

      const doc = toLocalDocument(data as Parameters<typeof toLocalDocument>[0])
      await db.documents.put(doc)
      return doc
    } catch (err) {
      logger.error({ err, id }, 'documentsService.getById failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch document', err)
    }
  },

  async getSignedUrl(filePath: string): Promise<string> {
    const cached = signedUrlCache.get(filePath)
    if (cached && Date.now() < cached.expiresAt) {
      return cached.url
    }

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, SIGNED_URL_EXPIRY_SECONDS)

      if (error || !data?.signedUrl) {
        throw new StorageError('Failed to generate signed URL', error)
      }

      logger.info({ filePath }, 'Signed URL generated')

      signedUrlCache.set(filePath, {
        url: data.signedUrl,
        expiresAt: Date.now() + SIGNED_URL_CACHE_MS,
      })

      return data.signedUrl
    } catch (err) {
      logger.error({ err, filePath }, 'documentsService.getSignedUrl failed')
      captureError(err)
      throw err instanceof StorageError ? err : new StorageError('Failed to generate signed URL', err)
    }
  },

  async upload(
    file: File,
    caseId: string,
    userId: string,
    metadata: UploadDocumentInput,
  ): Promise<DocumentModel> {
    // client-side validation
    const allowedTypes: readonly string[] = ALLOWED_MIME_TYPES
    if (!allowedTypes.includes(file.type)) {
      throw new StorageError(
        `File type not supported. Allowed: PDF, JPEG, PNG, WebP, HEIC.`,
      )
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new StorageError(`File exceeds 50MB limit. File size: ${formatFileSize(file.size)}.`)
    }

    // sanitize filename
    const sanitized = file.name
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100)

    const timestamp = Date.now()
    const storagePath = `${userId}/${caseId}/${timestamp}_${sanitized}`

    const supabase = getSupabaseClient()

    // upload to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      logger.error({ err: uploadError, userId, caseId }, 'Storage upload failed')
      captureError(uploadError)
      throw new StorageError('Failed to upload file. Please try again.', uploadError)
    }

    // insert DB record
    const id = crypto.randomUUID()
    const now = new Date().toISOString()

    const { error: dbError } = await docsFrom(supabase).insert({
      id,
      case_id: caseId,
      user_id: userId,
      name: metadata.name || file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      doc_type: metadata.doc_type ?? 'other',
      notes: metadata.notes ?? null,
      is_deleted: false,
      created_at: now,
    })

    if (dbError) {
      // cleanup storage on DB failure
      logger.error({ err: dbError, storagePath }, 'DB insert failed, cleaning up storage')
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
      captureError(dbError)
      throw new DatabaseError('Failed to save document record.', dbError)
    }

    const doc: LocalDocument = {
      id,
      case_id: caseId,
      user_id: userId,
      name: metadata.name || file.name,
      file_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      doc_type: metadata.doc_type ?? 'other',
      notes: metadata.notes ?? null,
      is_deleted: false,
      deleted_at: null,
      created_at: now,
      _synced: true,
    }

    await db.documents.put(doc)

    analytics.documentUploaded(file.type)
    logger.info({ id, caseId, mimeType: file.type }, 'Document uploaded successfully')

    return doc
  },

  async softDelete(id: string, filePath: string): Promise<void> {
    try {
      const now = new Date().toISOString()
      const online = isOnline()

      // write to Dexie immediately (authoritative local state)
      await db.documents.update(id, { is_deleted: true, deleted_at: now, _synced: false })

      // invalidate signed URL cache regardless of Supabase outcome
      signedUrlCache.delete(filePath)

      // attempt Supabase sync; failure is non-fatal (will sync on next load)
      if (online) {
        try {
          const supabase = getSupabaseClient()
          const { error } = await docsFrom(supabase)
            .update({ is_deleted: true, deleted_at: now })
            .eq('id', id)

          if (error) {
            logger.warn({ err: error, id }, 'Supabase document soft-delete failed - will sync later')
          } else {
            await db.documents.update(id, { _synced: true })
          }
        } catch (supabaseErr) {
          logger.warn({ err: supabaseErr, id }, 'Supabase document soft-delete threw - will sync later')
        }
      }

      analytics.documentDeleted()
      logger.info({ id }, 'Document soft-deleted')
    } catch (err) {
      logger.error({ err, id }, 'documentsService.softDelete failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to delete document', err)
    }
  },

  async updateDocType(id: string, docType: DocumentType): Promise<void> {
    try {
      await db.documents.update(id, { doc_type: docType, _synced: false })

      if (isOnline()) {
        try {
          const supabase = getSupabaseClient()
          const { error } = await docsFrom(supabase)
            .update({ doc_type: docType })
            .eq('id', id)

          if (error) {
            logger.warn({ err: error, id }, 'Supabase doc_type update failed – will sync later')
          } else {
            await db.documents.update(id, { _synced: true })
          }
        } catch (supabaseErr) {
          logger.warn({ err: supabaseErr, id }, 'Supabase doc_type update threw – will sync later')
        }
      }

      logger.info({ id, docType }, 'Document type updated')
    } catch (err) {
      logger.error({ err, id }, 'documentsService.updateDocType failed')
      captureError(err)
      throw err instanceof DatabaseError
        ? err
        : new DatabaseError('Failed to update document type', err)
    }
  },

  async getAllForUser(userId: string): Promise<DocumentModel[]> {
    try {
      const docs = await db.documents
        .where('user_id')
        .equals(userId)
        .filter((d) => !d.is_deleted)
        .toArray()

      docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      if (isOnline() && isStale(`user:${userId}`)) {
        const supabase = getSupabaseClient()
        docsFrom(supabase)
          .select('*')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .then(async ({ data, error }: { data: Parameters<typeof toLocalDocument>[0][] | null; error: unknown }) => {
            if (error || !data) return
            // do not overwrite documents with unsynced local changes (e.g. a pending soft-delete)
            const unsyncedIds = new Set(
              (await db.documents.filter((d) => !d._synced).toArray()).map((d) => d.id),
            )
            const toUpsert = data.filter((d) => !unsyncedIds.has(d.id)).map(toLocalDocument)
            await db.documents.bulkPut(toUpsert)
            lastFetchedAt.set(`user:${userId}`, Date.now())
          })
          .catch((err: unknown) => {
            logger.error({ err, userId }, 'documentsService user-level refresh failed')
          })
      }

      return docs
    } catch (err) {
      logger.error({ err, userId }, 'documentsService.getAllForUser failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch documents', err)
    }
  },

  async seedFromServer(documents: DocumentModel[]): Promise<void> {
    try {
      await db.documents.bulkPut(documents)
    } catch (err) {
      logger.error({ err }, 'documentsService.seedFromServer failed')
    }
  },

  async getStorageUsage(userId: string): Promise<{
    totalBytes: number
    totalFiles: number
    formattedSize: string
  }> {
    try {
      const docs = await db.documents
        .where('user_id')
        .equals(userId)
        .filter((d) => !d.is_deleted)
        .toArray()

      const totalBytes = docs.reduce((sum, d) => sum + (d.file_size ?? 0), 0)
      const totalFiles = docs.length

      return {
        totalBytes,
        totalFiles,
        formattedSize: formatFileSize(totalBytes),
      }
    } catch (err) {
      logger.error({ err, userId }, 'documentsService.getStorageUsage failed')
      captureError(err)
      throw new DatabaseError('Failed to calculate storage usage', err)
    }
  },
}
