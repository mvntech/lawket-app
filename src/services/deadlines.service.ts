import { db } from '@/lib/db/dexie'
import type { LocalDeadline } from '@/lib/db/dexie'
import { isOnline, createStaleTracker, queuePendingSync, createTableHelper } from '@/lib/db/service-utils'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { createDeadlineSchema, updateDeadlineSchema } from '@/lib/validations/deadline.schema'
import type { CreateDeadlineInput, UpdateDeadlineInput } from '@/lib/validations/deadline.schema'
import { DatabaseError } from '@/types/common.types'
import type { CaseStatus, DeadlinePriority } from '@/types/common.types'
import type { Database } from '@/types/database.types'
import { logger, captureError, analytics } from '@/lib/analytics'

const deadlinesFrom = createTableHelper(DB_TABLES.deadlines)

// types

export type DeadlineModel = LocalDeadline & {
  case_title?: string
  case_number?: string
  case_status?: CaseStatus
}

type SupabaseDeadline = Database['public']['Tables']['deadlines']['Row']

// priority sort order

const PRIORITY_ORDER: Record<DeadlinePriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

// staleness tracking - isolated to this service module

const stale = createStaleTracker()

// converters

function supabaseDeadlineToLocal(d: SupabaseDeadline): LocalDeadline {
  return {
    id: d.id,
    case_id: d.case_id,
    user_id: d.user_id,
    title: d.title,
    due_date: d.due_date,
    due_time: d.due_time,
    priority: d.priority as DeadlinePriority,
    is_completed: d.is_completed,
    completed_at: d.completed_at,
    notes: d.notes,
    is_deleted: d.is_deleted,
    created_at: d.created_at,
    updated_at: d.updated_at,
    _synced: true,
    _dirty: false,
  }
}

// background refresh

async function refreshDeadlinesFromSupabase(
  userId: string,
  filter: Record<string, string | boolean>,
  cacheKey: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  let query = deadlinesFrom(supabase).select('*').eq('user_id', userId)

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query

  if (error) throw new DatabaseError('Failed to refresh deadlines from Supabase', error)

  if (data) {
    const dirtyIds = new Set(
      (
        await db.deadlines
          .filter((d) => d._dirty && d.user_id === userId)
          .toArray()
      ).map((d) => d.id),
    )
    const toUpsert = (data as SupabaseDeadline[])
      .filter((d) => !dirtyIds.has(d.id))
      .map(supabaseDeadlineToLocal)
    await db.deadlines.bulkPut(toUpsert)
    stale.markFresh(cacheKey)
  }
}

// service

export const deadlinesService = {
  async getByCase(caseId: string): Promise<DeadlineModel[]> {
    try {
      const local = await db.deadlines
        .where('case_id')
        .equals(caseId)
        .filter((d) => !d.is_deleted)
        .toArray()

      local.sort((a, b) => a.due_date.localeCompare(b.due_date))

      if (isOnline() && stale.isStale(`case:${caseId}`)) {
        const userId = local[0]?.user_id
        if (userId) {
          refreshDeadlinesFromSupabase(userId, { case_id: caseId }, `case:${caseId}`).catch(
            (err) => {
              logger.error({ err, caseId }, 'deadlinesService background refresh failed')
            },
          )
        }
      }

      return local
    } catch (err) {
      logger.error({ err, caseId }, 'deadlinesService.getByCase failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch deadlines', err)
    }
  },

  async getUpcoming(userId: string, days = 30): Promise<DeadlineModel[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0]!
      const end = new Date()
      end.setUTCDate(end.getUTCDate() + days)
      const endStr = end.toISOString().split('T')[0]!

      const local = await db.deadlines
        .where('user_id')
        .equals(userId)
        .filter(
          (d) =>
            !d.is_deleted &&
            !d.is_completed &&
            d.due_date >= todayStr &&
            d.due_date <= endStr,
        )
        .toArray()

      local.sort((a, b) => {
        const dateDiff = a.due_date.localeCompare(b.due_date)
        if (dateDiff !== 0) return dateDiff
        const pa = PRIORITY_ORDER[a.priority as DeadlinePriority] ?? 2
        const pb = PRIORITY_ORDER[b.priority as DeadlinePriority] ?? 2
        return pa - pb
      })

      // Enrich with case data for display
      const upcomingCaseIds = [...new Set(local.map((d) => d.case_id))]
      const upcomingCaseMap = new Map<string, { title: string; case_number: string; status: CaseStatus }>()
      if (upcomingCaseIds.length > 0) {
        const upcomingCases = await db.cases
          .where('id')
          .anyOf(upcomingCaseIds)
          .filter((c) => !c.is_deleted)
          .toArray()
        for (const c of upcomingCases) {
          upcomingCaseMap.set(c.id, { title: c.title, case_number: c.case_number, status: c.status })
        }
      }

      const enriched: DeadlineModel[] = local.map((d) => {
        const caseData = upcomingCaseMap.get(d.case_id)
        return { ...d, case_title: caseData?.title, case_number: caseData?.case_number, case_status: caseData?.status }
      })

      const cacheKey = `upcoming:${userId}:${days}`
      if (isOnline() && stale.isStale(cacheKey)) {
        refreshDeadlinesFromSupabase(userId, { is_completed: false }, cacheKey).catch((err) => {
          logger.error({ err, userId }, 'deadlinesService.getUpcoming refresh failed')
        })
      }

      return enriched
    } catch (err) {
      logger.error({ err, userId }, 'deadlinesService.getUpcoming failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch upcoming deadlines', err)
    }
  },

  async getOverdue(userId: string): Promise<DeadlineModel[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0]!

      const local = await db.deadlines
        .where('user_id')
        .equals(userId)
        .filter((d) => !d.is_deleted && !d.is_completed && d.due_date < todayStr)
        .toArray()

      local.sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority as DeadlinePriority] ?? 2
        const pb = PRIORITY_ORDER[b.priority as DeadlinePriority] ?? 2
        if (pa !== pb) return pa - pb
        return a.due_date.localeCompare(b.due_date)
      })

      const overdueCaseIds = [...new Set(local.map((d) => d.case_id))]
      const overdueCaseMap = new Map<string, { title: string; case_number: string; status: CaseStatus }>()
      if (overdueCaseIds.length > 0) {
        const overdueCases = await db.cases
          .where('id')
          .anyOf(overdueCaseIds)
          .filter((c) => !c.is_deleted)
          .toArray()
        for (const c of overdueCases) {
          overdueCaseMap.set(c.id, { title: c.title, case_number: c.case_number, status: c.status })
        }
      }

      const enriched: DeadlineModel[] = local.map((d) => {
        const caseData = overdueCaseMap.get(d.case_id)
        return { ...d, case_title: caseData?.title, case_number: caseData?.case_number, case_status: caseData?.status }
      })

      return enriched
    } catch (err) {
      logger.error({ err, userId }, 'deadlinesService.getOverdue failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch overdue deadlines', err)
    }
  },

  async create(data: CreateDeadlineInput, userId: string): Promise<DeadlineModel> {
    const parsed = createDeadlineSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newDeadline: LocalDeadline = {
      id,
      case_id: parsed.data.case_id,
      user_id: userId,
      title: parsed.data.title,
      due_date: parsed.data.due_date,
      due_time: parsed.data.due_time ?? null,
      priority: parsed.data.priority,
      is_completed: false,
      completed_at: null,
      notes: parsed.data.notes ?? null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    }

    try {
      await db.deadlines.put(newDeadline)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await deadlinesFrom(supabase).insert({
          id: newDeadline.id,
          case_id: newDeadline.case_id,
          user_id: userId,
          title: newDeadline.title,
          due_date: newDeadline.due_date,
          due_time: newDeadline.due_time,
          priority: newDeadline.priority,
          notes: newDeadline.notes,
        })

        if (error) {
          logger.warn({ err: error, id }, 'Supabase deadline insert failed, queuing')
          await queuePendingSync(DB_TABLES.deadlines, 'insert', id, newDeadline)
        } else {
          await db.deadlines.update(id, { _synced: true, _dirty: false })
          newDeadline._synced = true
          newDeadline._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.deadlines, 'insert', id, newDeadline)
      }

      return newDeadline
    } catch (err) {
      logger.error({ err, userId }, 'deadlinesService.create failed')
      captureError(err)
      throw new DatabaseError('Failed to create deadline', err)
    }
  },

  async update(id: string, data: UpdateDeadlineInput): Promise<DeadlineModel> {
    const parsed = updateDeadlineSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    try {
      const existing = await db.deadlines.get(id)
      if (!existing || existing.is_deleted) {
        throw new DatabaseError('Deadline not found')
      }

      const now = new Date().toISOString()
      const updates = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<LocalDeadline>

      const updated: LocalDeadline = {
        ...existing,
        ...updates,
        updated_at: now,
        _dirty: true,
        _synced: false,
      }

      await db.deadlines.put(updated)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await deadlinesFrom(supabase)
          .update({ ...updates, updated_at: now })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase deadline update failed, queuing')
          await queuePendingSync(DB_TABLES.deadlines, 'update', id, updated)
        } else {
          await db.deadlines.update(id, { _synced: true, _dirty: false })
          updated._synced = true
          updated._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.deadlines, 'update', id, updated)
      }

      return updated
    } catch (err) {
      logger.error({ err, id }, 'deadlinesService.update failed')
      captureError(err)
      throw new DatabaseError('Failed to update deadline', err)
    }
  },

  async markComplete(id: string): Promise<void> {
    try {
      const existing = await db.deadlines.get(id)
      if (!existing || existing.is_deleted) {
        throw new DatabaseError('Deadline not found')
      }

      const now = new Date().toISOString()

      await db.deadlines.update(id, {
        is_completed: true,
        completed_at: now,
        updated_at: now,
        _dirty: true,
        _synced: false,
      })

      analytics.deadlineCompleted(existing.priority)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await deadlinesFrom(supabase)
          .update({ is_completed: true, completed_at: now, updated_at: now })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase deadline complete failed, queuing')
          await queuePendingSync(DB_TABLES.deadlines, 'update', id, {
            ...existing,
            is_completed: true,
            completed_at: now,
            updated_at: now,
          })
        } else {
          await db.deadlines.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.deadlines, 'update', id, {
          ...existing,
          is_completed: true,
          completed_at: now,
          updated_at: now,
        })
      }
    } catch (err) {
      logger.error({ err, id }, 'deadlinesService.markComplete failed')
      captureError(err)
      throw new DatabaseError('Failed to mark deadline as complete', err)
    }
  },

  async softDelete(id: string): Promise<void> {
    try {
      const existing = await db.deadlines.get(id)
      if (!existing) throw new DatabaseError('Deadline not found')

      const now = new Date().toISOString()

      await db.deadlines.update(id, {
        is_deleted: true,
        _dirty: true,
        _synced: false,
      })

      if (isOnline()) {
        const supabase = getSupabaseClient()
        // use SECURITY DEFINER RPC to avoid SELECT-policy WITH CHECK inference
        // blocking direct UPDATE when is_deleted → true (error 42501)
        const { error } = await (supabase as any).rpc('soft_delete_deadline', { p_id: id })

        if (error) {
          logger.warn({ err: error, id }, 'Supabase deadline soft-delete failed, queuing')
          await queuePendingSync(DB_TABLES.deadlines, 'update', id, {
            ...existing,
            is_deleted: true,
          })
        } else {
          await db.deadlines.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.deadlines, 'update', id, {
          ...existing,
          is_deleted: true,
        })
      }
    } catch (err) {
      logger.error({ err, id }, 'deadlinesService.softDelete failed')
      captureError(err)
      throw new DatabaseError('Failed to delete deadline', err)
    }
  },

  // pure sort - critical → high → medium → low, then by due_date ascending.
  getPrioritySorted(deadlines: DeadlineModel[]): DeadlineModel[] {
    return [...deadlines].sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority as DeadlinePriority] ?? 2
      const pb = PRIORITY_ORDER[b.priority as DeadlinePriority] ?? 2
      if (pa !== pb) return pa - pb
      return a.due_date.localeCompare(b.due_date)
    })
  },
}
