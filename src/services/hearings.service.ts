import { db } from '@/lib/db/dexie'
import type { LocalHearing, PendingSyncOperation } from '@/lib/db/dexie'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { STALE_TIME_MS } from '@/lib/constants/app'
import { createHearingSchema, updateHearingSchema } from '@/lib/validations/hearing.schema'
import type { CreateHearingInput, UpdateHearingInput } from '@/lib/validations/hearing.schema'
import { DatabaseError } from '@/types/common.types'
import type { CaseStatus } from '@/types/common.types'
import type { Database } from '@/types/database.types'
import { logger, captureError } from '@/lib/analytics'

// supabase typed helper

type SupabaseClient = ReturnType<typeof getSupabaseClient>
function hearingsFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.hearings)
}

// types

export type HearingModel = LocalHearing & {
  case_title?: string
  case_number?: string
  case_status?: CaseStatus
}

type SupabaseHearing = Database['public']['Tables']['hearings']['Row']

// staleness tracking

const lastFetchedAt = new Map<string, number>()

function isStale(key: string): boolean {
  const t = lastFetchedAt.get(key)
  return !t || Date.now() - t > STALE_TIME_MS
}

// converters

function supabaseHearingToLocal(h: SupabaseHearing): LocalHearing {
  return {
    id: h.id,
    case_id: h.case_id,
    user_id: h.user_id,
    title: h.title,
    hearing_date: h.hearing_date,
    hearing_time: h.hearing_time,
    court_name: h.court_name,
    court_room: h.court_room,
    judge_name: h.judge_name,
    notes: h.notes,
    is_deleted: h.is_deleted,
    created_at: h.created_at,
    updated_at: h.updated_at,
    _synced: true,
    _dirty: false,
  }
}

// pending sync queue

async function queuePendingSync(
  tableName: string,
  operation: PendingSyncOperation['operation'],
  recordId: string,
  payload: LocalHearing,
): Promise<void> {
  await db.pendingSync.add({
    table_name: tableName,
    operation,
    record_id: recordId,
    payload: JSON.stringify(payload),
    created_at: new Date().toISOString(),
    retry_count: 0,
  })
}

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

// background refresh helpers

async function refreshHearingsFromSupabase(
  filter: Record<string, string>,
  userId: string,
  cacheKey: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  let query = hearingsFrom(supabase)
    .select('*')
    .eq('is_deleted', false)

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value)
  }

  const { data, error } = await query

  if (error) throw new DatabaseError('Failed to refresh hearings from Supabase', error)

  if (data) {
    const dirtyIds = new Set(
      (
        await db.hearings
          .filter((h) => h._dirty && h.user_id === userId)
          .toArray()
      ).map((h) => h.id),
    )
    const toUpsert = (data as SupabaseHearing[])
      .filter((h) => !dirtyIds.has(h.id))
      .map(supabaseHearingToLocal)
    await db.hearings.bulkPut(toUpsert)
    lastFetchedAt.set(cacheKey, Date.now())
  }
}

async function refreshRangeFromSupabase(
  userId: string,
  fromStr: string,
  toStr: string,
  cacheKey: string,
): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await hearingsFrom(supabase)
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .gte('hearing_date', fromStr)
    .lte('hearing_date', toStr)

  if (error) throw new DatabaseError('Failed to refresh hearings from Supabase', error)

  if (data) {
    const dirtyIds = new Set(
      (
        await db.hearings
          .filter((h) => h._dirty && h.user_id === userId)
          .toArray()
      ).map((h) => h.id),
    )
    const toUpsert = (data as SupabaseHearing[])
      .filter((h) => !dirtyIds.has(h.id))
      .map(supabaseHearingToLocal)
    await db.hearings.bulkPut(toUpsert)
    lastFetchedAt.set(cacheKey, Date.now())
  }
}

// service

export const hearingsService = {
  async getByCase(caseId: string): Promise<HearingModel[]> {
    try {
      const local = await db.hearings
        .where('case_id')
        .equals(caseId)
        .filter((h) => !h.is_deleted)
        .toArray()

      local.sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))

      if (isOnline() && isStale(`case:${caseId}`)) {
        // get user_id from first hearing or skip background refresh
        const userId = local[0]?.user_id
        if (userId) {
          refreshHearingsFromSupabase(
            { case_id: caseId, user_id: userId },
            userId,
            `case:${caseId}`,
          ).catch((err) => {
            logger.error({ err, caseId }, 'hearingsService background refresh failed')
          })
        }
      }

      return local
    } catch (err) {
      logger.error({ err, caseId }, 'hearingsService.getByCase failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch hearings', err)
    }
  },

  async getUpcoming(userId: string, days = 30): Promise<HearingModel[]> {
    try {
      const todayStr = new Date().toISOString().split('T')[0]!
      const end = new Date()
      end.setUTCDate(end.getUTCDate() + days)
      const endStr = end.toISOString().split('T')[0]!

      const local = await db.hearings
        .where('user_id')
        .equals(userId)
        .filter(
          (h) =>
            !h.is_deleted &&
            h.hearing_date >= todayStr &&
            h.hearing_date <= endStr,
        )
        .toArray()

      local.sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))

      // enrich with case data for display
      const upcomingCaseIds = [...new Set(local.map((h) => h.case_id))]
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

      const enriched: HearingModel[] = local.map((h) => {
        const caseData = upcomingCaseMap.get(h.case_id)
        return { ...h, case_title: caseData?.title, case_number: caseData?.case_number, case_status: caseData?.status }
      })

      const cacheKey = `upcoming:${userId}:${days}`
      if (isOnline() && isStale(cacheKey)) {
        refreshRangeFromSupabase(userId, todayStr, endStr, cacheKey).catch((err) => {
          logger.error({ err, userId }, 'hearingsService.getUpcoming refresh failed')
        })
      }

      return enriched
    } catch (err) {
      logger.error({ err, userId }, 'hearingsService.getUpcoming failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch upcoming hearings', err)
    }
  },

  async getByDateRange(userId: string, from: Date, to: Date): Promise<HearingModel[]> {
    try {
      const fromStr = from.toISOString().split('T')[0]
      const toStr = to.toISOString().split('T')[0]

      const local = await db.hearings
        .where('user_id')
        .equals(userId)
        .filter(
          (h) =>
            !h.is_deleted &&
            h.hearing_date >= fromStr &&
            h.hearing_date <= toStr,
        )
        .toArray()

      local.sort((a, b) => a.hearing_date.localeCompare(b.hearing_date))

      // enrich with case data for calendar display
      const caseIds = [...new Set(local.map((h) => h.case_id))]
      const caseMap = new Map<string, { title: string; case_number: string; status: CaseStatus }>()
      if (caseIds.length > 0) {
        const cases = await db.cases
          .where('id')
          .anyOf(caseIds)
          .filter((c) => !c.is_deleted)
          .toArray()
        for (const c of cases) {
          caseMap.set(c.id, { title: c.title, case_number: c.case_number, status: c.status })
        }
      }

      const enriched: HearingModel[] = local.map((h) => {
        const caseData = caseMap.get(h.case_id)
        return {
          ...h,
          case_title: caseData?.title,
          case_number: caseData?.case_number,
          case_status: caseData?.status,
        }
      })

      const cacheKey = `range:${userId}:${fromStr}:${toStr}`
      if (isOnline() && isStale(cacheKey)) {
        refreshRangeFromSupabase(userId, fromStr, toStr, cacheKey).catch((err) => {
          logger.error({ err, userId }, 'hearingsService.getByDateRange refresh failed')
        })
      }

      return enriched
    } catch (err) {
      logger.error({ err, userId }, 'hearingsService.getByDateRange failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch hearings by date range', err)
    }
  },

  async create(data: CreateHearingInput, userId: string): Promise<HearingModel> {
    const parsed = createHearingSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const newHearing: LocalHearing = {
      id,
      case_id: parsed.data.case_id,
      user_id: userId,
      title: parsed.data.title,
      hearing_date: parsed.data.hearing_date,
      hearing_time: parsed.data.hearing_time ?? null,
      court_name: parsed.data.court_name ?? null,
      court_room: parsed.data.court_room ?? null,
      judge_name: parsed.data.judge_name ?? null,
      notes: parsed.data.notes ?? null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    }

    try {
      await db.hearings.put(newHearing)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await hearingsFrom(supabase).insert({
          id: newHearing.id,
          case_id: newHearing.case_id,
          user_id: userId,
          title: newHearing.title,
          hearing_date: newHearing.hearing_date,
          hearing_time: newHearing.hearing_time,
          court_name: newHearing.court_name,
          court_room: newHearing.court_room,
          judge_name: newHearing.judge_name,
          notes: newHearing.notes,
        })

        if (error) {
          logger.warn({ err: error, id }, 'Supabase hearing insert failed, queuing')
          await queuePendingSync(DB_TABLES.hearings, 'insert', id, newHearing)
        } else {
          await db.hearings.update(id, { _synced: true, _dirty: false })
          newHearing._synced = true
          newHearing._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.hearings, 'insert', id, newHearing)
      }

      return newHearing
    } catch (err) {
      logger.error({ err, userId }, 'hearingsService.create failed')
      captureError(err)
      throw new DatabaseError('Failed to create hearing', err)
    }
  },

  async update(id: string, data: UpdateHearingInput): Promise<HearingModel> {
    const parsed = updateHearingSchema.safeParse(data)
    if (!parsed.success) {
      throw new DatabaseError(`Validation failed: ${parsed.error.message}`)
    }

    try {
      const existing = await db.hearings.get(id)
      if (!existing || existing.is_deleted) {
        throw new DatabaseError('Hearing not found')
      }

      const now = new Date().toISOString()
      const updates = Object.fromEntries(
        Object.entries(parsed.data).filter(([, v]) => v !== undefined),
      ) as Partial<LocalHearing>

      const updated: LocalHearing = {
        ...existing,
        ...updates,
        updated_at: now,
        _dirty: true,
        _synced: false,
      }

      await db.hearings.put(updated)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await hearingsFrom(supabase)
          .update({ ...updates, updated_at: now })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase hearing update failed, queuing')
          await queuePendingSync(DB_TABLES.hearings, 'update', id, updated)
        } else {
          await db.hearings.update(id, { _synced: true, _dirty: false })
          updated._synced = true
          updated._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.hearings, 'update', id, updated)
      }

      return updated
    } catch (err) {
      logger.error({ err, id }, 'hearingsService.update failed')
      captureError(err)
      throw new DatabaseError('Failed to update hearing', err)
    }
  },

  async softDelete(id: string): Promise<void> {
    try {
      const existing = await db.hearings.get(id)
      if (!existing) throw new DatabaseError('Hearing not found')

      const now = new Date().toISOString()

      await db.hearings.update(id, {
        is_deleted: true,
        _dirty: true,
        _synced: false,
      })

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await hearingsFrom(supabase)
          .update({ is_deleted: true, deleted_at: now })
          .eq('id', id)

        if (error) {
          logger.warn({ err: error, id }, 'Supabase hearing soft-delete failed, queuing')
          await queuePendingSync(DB_TABLES.hearings, 'update', id, {
            ...existing,
            is_deleted: true,
          })
        } else {
          await db.hearings.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.hearings, 'update', id, {
          ...existing,
          is_deleted: true,
        })
      }
    } catch (err) {
      logger.error({ err, id }, 'hearingsService.softDelete failed')
      captureError(err)
      throw new DatabaseError('Failed to delete hearing', err)
    }
  },
}
