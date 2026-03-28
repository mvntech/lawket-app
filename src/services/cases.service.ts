import { db } from '@/lib/db/dexie'
import type { LocalCase } from '@/lib/db/dexie'
import { isOnline, createStaleTracker, queuePendingSync, createTableHelper } from '@/lib/db/service-utils'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/app'
import { createCaseSchema, updateCaseSchema } from '@/lib/validations/case.schema'
import type { CreateCaseInput, UpdateCaseInput } from '@/lib/validations/case.schema'
import type { CaseStatus, CaseType } from '@/types/common.types'
import { DatabaseError } from '@/types/common.types'
import type { Database } from '@/types/database.types'
import { logger, captureError } from '@/lib/analytics'

const casesFrom = createTableHelper(DB_TABLES.cases)

// types

export type CaseModel = LocalCase

export interface CaseStats {
  active: number
  pending: number
  closed: number
  archived: number
  total: number
}

export interface GetCasesOptions {
  page?: number
  pageSize?: number
  status?: CaseStatus
  caseType?: CaseType
  search?: string
}

type SupabaseCase = Database['public']['Tables']['cases']['Row']

// staleness tracking - isolated to this service module

const stale = createStaleTracker()

// converters

function supabaseCaseToLocal(c: SupabaseCase): LocalCase {
  return {
    id: c.id,
    user_id: c.user_id,
    case_number: c.case_number,
    title: c.title,
    client_name: c.client_name,
    client_contact: c.client_contact,
    opposing_party: c.opposing_party,
    court_name: c.court_name,
    judge_name: c.judge_name,
    case_type: c.case_type as CaseType,
    status: c.status as CaseStatus,
    description: c.description,
    notes: c.notes,
    filed_date: c.filed_date,
    is_deleted: c.is_deleted,
    deleted_at: c.deleted_at,
    created_at: c.created_at,
    updated_at: c.updated_at,
    _synced: true,
    _dirty: false,
  }
}

// pending sync queue

// background refresh

async function refreshFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await casesFrom(supabase)
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })

  if (error) throw new DatabaseError('Failed to refresh cases from Supabase', error)

  if (data) {
    // do not overwrite cases with unsynced local edits
    const dirtyIds = new Set(
      (await db.cases.filter((c) => c._dirty && c.user_id === userId).toArray()).map(
        (c) => c.id,
      ),
    )
    const toUpsert = (data as SupabaseCase[]).filter((c) => !dirtyIds.has(c.id)).map(supabaseCaseToLocal)
    await db.cases.bulkPut(toUpsert)
    stale.markFresh(userId)
  }
}

// service

export const casesService = {
  async getAll(userId: string, options: GetCasesOptions = {}): Promise<CaseModel[]> {
    const { page = 0, pageSize = DEFAULT_PAGE_SIZE, status, caseType, search } = options

    try {
      let cases = await db.cases
        .where('user_id')
        .equals(userId)
        .filter((c) => !c.is_deleted)
        .toArray()

      if (status) {
        cases = cases.filter((c) => c.status === status)
      }

      if (caseType) {
        cases = cases.filter((c) => c.case_type === caseType)
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim()
        cases = cases.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.client_name.toLowerCase().includes(q) ||
            c.case_number.toLowerCase().includes(q),
        )
      }

      cases.sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      )

      const offset = page * pageSize
      const paginated = cases.slice(offset, offset + pageSize)

      // background refresh if online and stale
      if (isOnline() && stale.isStale(userId)) {
        refreshFromSupabase(userId).catch((err) => {
          logger.error({ err, userId }, 'casesService background refresh failed')
        })
      }

      return paginated
    } catch (err) {
      logger.error({ err, userId }, 'casesService.getAll failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch cases', err)
    }
  },

  async getById(id: string): Promise<CaseModel | null> {
    try {
      const local = await db.cases.get(id)
      if (local && !local.is_deleted) return local

      if (!isOnline()) return null

      const supabase = getSupabaseClient()
      const { data, error } = await casesFrom(supabase)
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle()

      if (error) throw new DatabaseError('Failed to fetch case', error)
      if (!data) return null

      const localCase = supabaseCaseToLocal(data)
      await db.cases.put(localCase)
      return localCase
    } catch (err) {
      logger.error({ err, id }, 'casesService.getById failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch case', err)
    }
  },

  async create(data: CreateCaseInput, userId: string): Promise<CaseModel> {
    const parsed = createCaseSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newCase: LocalCase = {
      id,
      user_id: userId,
      case_number: parsed.data.case_number,
      title: parsed.data.title,
      client_name: parsed.data.client_name,
      client_contact: parsed.data.client_contact ?? null,
      opposing_party: parsed.data.opposing_party ?? null,
      court_name: parsed.data.court_name ?? null,
      judge_name: parsed.data.judge_name ?? null,
      case_type: parsed.data.case_type,
      status: parsed.data.status,
      description: parsed.data.description ?? null,
      notes: parsed.data.notes ?? null,
      filed_date: parsed.data.filed_date ?? null,
      is_deleted: false,
      deleted_at: null,
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    }

    try {
      await db.cases.put(newCase)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await casesFrom(supabase).insert({
          id: newCase.id,
          user_id: userId,
          case_number: newCase.case_number,
          title: newCase.title,
          client_name: newCase.client_name,
          client_contact: newCase.client_contact,
          opposing_party: newCase.opposing_party,
          court_name: newCase.court_name,
          judge_name: newCase.judge_name,
          case_type: newCase.case_type,
          status: newCase.status,
          description: newCase.description,
          notes: newCase.notes,
          filed_date: newCase.filed_date,
        })

        if (error) {
          logger.warn({ err: error, id }, 'Supabase insert failed, queuing for sync')
          await queuePendingSync(DB_TABLES.cases, 'insert', id, newCase)
        } else {
          await db.cases.update(id, { _synced: true, _dirty: false })
          newCase._synced = true
          newCase._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.cases, 'insert', id, newCase)
      }

      return newCase
    } catch (err) {
      logger.error({ err, userId }, 'casesService.create failed')
      captureError(err)
      throw new DatabaseError('Failed to create case', err)
    }
  },

  async update(id: string, data: UpdateCaseInput): Promise<CaseModel> {
    const parsed = updateCaseSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    try {
      const existing = await db.cases.get(id)
      if (!existing || existing.is_deleted) {
        throw new DatabaseError('Case not found')
      }

      const now = new Date().toISOString()
      const updates = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<LocalCase>

      const updated: LocalCase = {
        ...existing,
        ...updates,
        updated_at: now,
        _dirty: true,
        _synced: false,
      }

      await db.cases.put(updated)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await casesFrom(supabase)
          .update({ ...updates, updated_at: now })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase update failed, queuing for sync')
          await queuePendingSync(DB_TABLES.cases, 'update', id, updated)
        } else {
          await db.cases.update(id, { _synced: true, _dirty: false })
          updated._synced = true
          updated._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.cases, 'update', id, updated)
      }

      return updated
    } catch (err) {
      logger.error({ err, id }, 'casesService.update failed')
      captureError(err)
      throw new DatabaseError('Failed to update case', err)
    }
  },

  async softDelete(id: string, userId: string): Promise<void> {
    try {
      const existing = await db.cases.get(id)
      if (!existing) throw new DatabaseError('Case not found')

      const now = new Date().toISOString()

      await db.cases.update(id, {
        is_deleted: true,
        deleted_at: now,
        _dirty: true,
        _synced: false,
      })

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await casesFrom(supabase)
          .update({ is_deleted: true, deleted_at: now, deleted_by: userId })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase soft-delete failed, queuing for sync')
          await queuePendingSync(DB_TABLES.cases, 'update', id, {
            ...existing,
            is_deleted: true,
            deleted_at: now,
          })
        } else {
          await db.cases.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.cases, 'update', id, {
          ...existing,
          is_deleted: true,
          deleted_at: now,
        })
      }
    } catch (err) {
      logger.error({ err, id }, 'casesService.softDelete failed')
      captureError(err)
      throw new DatabaseError('Failed to delete case', err)
    }
  },

  async getStats(userId: string, isRetry = false): Promise<CaseStats> {
    try {
      const cases = await db.cases
        .where('user_id')
        .equals(userId)
        .filter((c) => !c.is_deleted)
        .toArray()

      const stats: CaseStats = { active: 0, pending: 0, closed: 0, archived: 0, total: 0 }
      for (const c of cases) {
        stats.total++
        if (c.status === 'active') stats.active++
        else if (c.status === 'pending') stats.pending++
        else if (c.status === 'closed') stats.closed++
        else if (c.status === 'archived') stats.archived++
      }

      // if dexie is empty and we are online, prime the cache once
      if (stats.total === 0 && !isRetry && isOnline()) {
        try {
          await refreshFromSupabase(userId)
          return casesService.getStats(userId, true)
        } catch {
          // ignore refresh errors, return empty stats
        }
      }

      return stats
    } catch (err) {
      logger.error({ err, userId }, 'casesService.getStats failed')
      captureError(err)
      throw new DatabaseError('Failed to get case stats', err)
    }
  },

  async getDeleted(userId: string): Promise<CaseModel[]> {
    try {
      const local = await db.cases
        .where('user_id')
        .equals(userId)
        .filter((c) => c.is_deleted)
        .toArray()

      local.sort((a, b) => new Date(b.deleted_at ?? b.updated_at).getTime() - new Date(a.deleted_at ?? a.updated_at).getTime())

      if (isOnline()) {
        const supabase = getSupabaseClient()
        casesFrom(supabase)
          .select('*')
          .eq('user_id', userId)
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false })
          .then(({ data, error }: { data: SupabaseCase[] | null; error: unknown }) => {
            if (error || !data) return
            db.cases.bulkPut(data.map(supabaseCaseToLocal)).catch(() => undefined)
          })
          .catch(() => undefined)
      }

      return local
    } catch (err) {
      logger.error({ err, userId }, 'casesService.getDeleted failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch deleted cases', err)
    }
  },

  async restore(id: string): Promise<CaseModel> {
    try {
      const existing = await db.cases.get(id)
      if (!existing) throw new DatabaseError('Case not found')

      const now = new Date().toISOString()
      await db.cases.update(id, {
        is_deleted: false,
        deleted_at: null,
        _dirty: true,
        _synced: false,
      })

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await casesFrom(supabase)
          .update({ is_deleted: false, deleted_at: null, deleted_by: null })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase restore failed, queuing for sync')
          await queuePendingSync(DB_TABLES.cases, 'update', id, { ...existing, is_deleted: false, deleted_at: null })
        } else {
          await db.cases.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.cases, 'update', id, { ...existing, is_deleted: false, deleted_at: null })
      }

      const restored = await db.cases.get(id)
      if (!restored) throw new DatabaseError('Case not found after restore')
      logger.info({ id }, 'Case restored')
      return { ...existing, is_deleted: false, deleted_at: null, updated_at: now }
    } catch (err) {
      logger.error({ err, id }, 'casesService.restore failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to restore case', err)
    }
  },

  async permanentDelete(id: string): Promise<void> {
    try {
      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await casesFrom(supabase).delete().eq('id', id)
        if (error) throw new DatabaseError('Failed to permanently delete case', error)
      }
      await db.cases.delete(id)
      logger.info({ id }, 'Case permanently deleted')
    } catch (err) {
      logger.error({ err, id }, 'casesService.permanentDelete failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to permanently delete case', err)
    }
  },

  // seed dexie with server-fetched cases
  async seedFromServer(cases: LocalCase[]): Promise<void> {
    // protect both unsaved local edits (_dirty) and local soft-deletes (is_deleted)
    // without the is_deleted guard, a stale next.js router-cache response can restore
    // a just-deleted record: after a successful supabase soft-delete _dirty is cleared,
    // so without this guard seedFromServer would bulkPut the record back as is_deleted:false.
    const protectedIds = new Set(
      (await db.cases.filter((c) => c._dirty || c.is_deleted).toArray()).map((c) => c.id),
    )
    const toUpsert = cases.filter((c) => !protectedIds.has(c.id))
    await db.cases.bulkPut(toUpsert)
  },
}
