import { db } from '@/lib/db/dexie'
import type { LocalContact, PendingSyncOperation } from '@/lib/db/dexie'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { DEFAULT_PAGE_SIZE, STALE_TIME_MS } from '@/lib/constants/app'
import { createContactSchema, updateContactSchema } from '@/lib/validations/contact.schema'
import type { CreateContactInput, UpdateContactInput } from '@/lib/validations/contact.schema'
import type { ContactModel, ContactRole } from '@/types/common.types'
import { DatabaseError } from '@/types/common.types'
import type { Database } from '@/types/database.types'
import type { LocalCase } from '@/lib/db/dexie'

type SupabaseCaseRow = Database['public']['Tables']['cases']['Row']
export type LinkedCase = LocalCase
import { logger, captureError, analytics } from '@/lib/analytics'

// supabase typed helpers

type SupabaseClient = ReturnType<typeof getSupabaseClient>
function contactsFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.contacts)
}
function caseContactsFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.caseContacts)
}

// types

export type { ContactModel }

type SupabaseContact = Database['public']['Tables']['contacts']['Row']

export interface GetContactsOptions {
  page?: number
  pageSize?: number
  search?: string
  role?: ContactRole
}

// staleness tracking

const lastFetchedAt = new Map<string, number>()

function isStale(key: string): boolean {
  const t = lastFetchedAt.get(key)
  return !t || Date.now() - t > STALE_TIME_MS
}

// converters

function supabaseContactToLocal(c: SupabaseContact): LocalContact {
  return {
    id: c.id,
    user_id: c.user_id,
    full_name: c.full_name,
    role: c.role,
    email: c.email ?? null,
    phone: c.phone ?? null,
    organization: c.organization ?? null,
    notes: c.notes ?? null,
    is_deleted: c.is_deleted,
    created_at: c.created_at,
    updated_at: c.updated_at,
    _synced: true,
    _dirty: false,
  }
}

function localToModel(c: LocalContact): ContactModel {
  return c as ContactModel
}

// helpers

function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

async function queuePendingSync(
  tableName: string,
  operation: PendingSyncOperation['operation'],
  recordId: string,
  payload: LocalContact,
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

async function refreshFromSupabase(userId: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { data, error } = await contactsFrom(supabase)
    .select('*')
    .eq('user_id', userId)
    .eq('is_deleted', false)
    .order('full_name', { ascending: true })

  if (error) throw new DatabaseError('Failed to refresh contacts from Supabase', error)

  if (data) {
    const dirtyIds = new Set(
      (
        await db.contacts
          .filter((c) => c._dirty && c.user_id === userId)
          .toArray()
      ).map((c) => c.id),
    )
    const toUpsert = (data as SupabaseContact[])
      .filter((c) => !dirtyIds.has(c.id))
      .map(supabaseContactToLocal)
    await db.contacts.bulkPut(toUpsert)
    lastFetchedAt.set(userId, Date.now())
  }
}

// service

export const contactsService = {
  async getAll(userId: string, options: GetContactsOptions = {}): Promise<ContactModel[]> {
    const { page = 0, pageSize = DEFAULT_PAGE_SIZE, search, role } = options

    try {
      let contacts = await db.contacts
        .where('user_id')
        .equals(userId)
        .filter((c) => !c.is_deleted)
        .toArray()

      if (role) {
        contacts = contacts.filter((c) => c.role === role)
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim()
        contacts = contacts.filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.organization ?? '').toLowerCase().includes(q) ||
            (c.email ?? '').toLowerCase().includes(q),
        )
      }

      contacts.sort((a, b) => a.full_name.localeCompare(b.full_name))

      const offset = page * pageSize
      const paginated = contacts.slice(offset, offset + pageSize)

      if (isOnline() && isStale(userId)) {
        refreshFromSupabase(userId).catch((err) => {
          logger.error({ err, userId }, 'contactsService background refresh failed')
        })
      }

      return paginated.map(localToModel)
    } catch (err) {
      logger.error({ err, userId }, 'contactsService.getAll failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch contacts', err)
    }
  },

  async getById(id: string): Promise<ContactModel | null> {
    try {
      const local = await db.contacts.get(id)
      if (local && !local.is_deleted) return localToModel(local)

      if (!isOnline()) return null

      const supabase = getSupabaseClient()
      const { data, error } = await contactsFrom(supabase)
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .maybeSingle()

      if (error) throw new DatabaseError('Failed to fetch contact', error)
      if (!data) return null

      const local2 = supabaseContactToLocal(data as SupabaseContact)
      await db.contacts.put(local2)
      return localToModel(local2)
    } catch (err) {
      logger.error({ err, id }, 'contactsService.getById failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch contact', err)
    }
  },

  async getByCase(caseId: string): Promise<ContactModel[]> {
    try {
      if (!isOnline()) {
        const all = await db.contacts.filter((c) => !c.is_deleted).toArray()
        return all.map(localToModel)
      }

      const supabase = getSupabaseClient()
      const { data, error } = await caseContactsFrom(supabase)
        .select('contacts(*)')
        .eq('case_id', caseId)

      if (error) throw new DatabaseError('Failed to fetch case contacts', error)

      const contacts: ContactModel[] = []
      for (const row of (data ?? []) as Array<{ contacts: SupabaseContact | null }>) {
        if (!row.contacts || row.contacts.is_deleted) continue
        const local = supabaseContactToLocal(row.contacts)
        await db.contacts.put(local)
        contacts.push(localToModel(local))
      }

      contacts.sort((a, b) => a.full_name.localeCompare(b.full_name))
      return contacts
    } catch (err) {
      logger.error({ err, caseId }, 'contactsService.getByCase failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch case contacts', err)
    }
  },

  async create(data: CreateContactInput, userId: string): Promise<ContactModel> {
    const validated = createContactSchema.parse(data)
    const now = new Date().toISOString()
    const id = crypto.randomUUID()

    const local: LocalContact = {
      id,
      user_id: userId,
      full_name: validated.full_name,
      role: validated.role,
      email: validated.email || null,
      phone: validated.phone || null,
      organization: validated.organization || null,
      notes: validated.notes || null,
      is_deleted: false,
      created_at: now,
      updated_at: now,
      _synced: false,
      _dirty: true,
    }

    try {
      await db.contacts.put(local)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await contactsFrom(supabase).insert({
          id,
          user_id: userId,
          full_name: local.full_name,
          role: local.role,
          email: local.email,
          phone: local.phone,
          organization: local.organization,
          notes: local.notes,
        })

        if (error) {
          logger.warn({ err: error, id }, 'Supabase insert failed, queuing for sync')
          await queuePendingSync(DB_TABLES.contacts, 'insert', id, local)
        } else {
          await db.contacts.update(id, { _synced: true, _dirty: false })
          local._synced = true
          local._dirty = false
        }
      } else {
        await queuePendingSync(DB_TABLES.contacts, 'insert', id, local)
      }

      analytics.contactAdded(validated.role)
      return localToModel(local)
    } catch (err) {
      logger.error({ err, userId }, 'contactsService.create failed')
      captureError(err)
      throw new DatabaseError('Failed to create contact', err)
    }
  },

  async update(id: string, data: UpdateContactInput): Promise<ContactModel> {
    const validated = updateContactSchema.parse(data)
    const now = new Date().toISOString()

    try {
      const existing = await db.contacts.get(id)
      if (!existing) throw new DatabaseError('Contact not found', { id })

      const updated: LocalContact = {
        ...existing,
        ...(validated.full_name !== undefined && { full_name: validated.full_name }),
        ...(validated.role !== undefined && { role: validated.role }),
        email: validated.email !== undefined ? (validated.email || null) : existing.email,
        phone: validated.phone !== undefined ? (validated.phone || null) : existing.phone,
        organization: validated.organization !== undefined ? (validated.organization || null) : existing.organization,
        notes: validated.notes !== undefined ? (validated.notes || null) : existing.notes,
        updated_at: now,
        _dirty: true,
        _synced: false,
      }

      await db.contacts.put(updated)

      if (isOnline()) {
        const supabase = getSupabaseClient()
        const { error } = await contactsFrom(supabase)
          .update({
            full_name: updated.full_name,
            role: updated.role,
            email: updated.email,
            phone: updated.phone,
            organization: updated.organization,
            notes: updated.notes,
            updated_at: now,
          })
          .eq('id', id)

        if (error) {
          await queuePendingSync(DB_TABLES.contacts, 'update', id, updated)
        } else {
          await db.contacts.update(id, { _synced: true, _dirty: false })
        }
      } else {
        await queuePendingSync(DB_TABLES.contacts, 'update', id, updated)
      }

      analytics.contactUpdated()
      return localToModel(updated)
    } catch (err) {
      logger.error({ err, id }, 'contactsService.update failed')
      captureError(err)
      throw new DatabaseError('Failed to update contact', err)
    }
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString()

    try {
      await db.contacts.update(id, {
        is_deleted: true,
        _dirty: true,
        _synced: false,
        updated_at: now,
      })

      if (isOnline()) {
        const supabase = getSupabaseClient()

        // hard delete junction rows (case_contacts has no soft delete)
        await caseContactsFrom(supabase).delete().eq('contact_id', id)

        // soft delete the contact record
        const { error } = await contactsFrom(supabase)
          .update({ is_deleted: true, updated_at: now })
          .eq('id', id)

        if (!error) {
          await db.contacts.update(id, { _synced: true, _dirty: false })
        }
      }

      analytics.contactDeleted()
    } catch (err) {
      logger.error({ err, id }, 'contactsService.softDelete failed')
      captureError(err)
      throw new DatabaseError('Failed to delete contact', err)
    }
  },

  async linkToCase(contactId: string, caseId: string): Promise<void> {
    try {
      if (!isOnline()) return

      const supabase = getSupabaseClient()

      const { data: existing } = await caseContactsFrom(supabase)
        .select('case_id')
        .eq('contact_id', contactId)
        .eq('case_id', caseId)
        .maybeSingle()

      if (existing) return

      const { error } = await caseContactsFrom(supabase).insert({
        contact_id: contactId,
        case_id: caseId,
      })

      if (error) throw new DatabaseError('Failed to link contact to case', error)

      analytics.contactLinkedToCase()
    } catch (err) {
      logger.error({ err, contactId, caseId }, 'contactsService.linkToCase failed')
      captureError(err)
      throw new DatabaseError('Failed to link contact to case', err)
    }
  },

  async unlinkFromCase(contactId: string, caseId: string): Promise<void> {
    try {
      if (!isOnline()) return

      const supabase = getSupabaseClient()
      const { error } = await caseContactsFrom(supabase)
        .delete()
        .eq('contact_id', contactId)
        .eq('case_id', caseId)

      if (error) throw new DatabaseError('Failed to unlink contact from case', error)

      analytics.contactUnlinkedFromCase()
    } catch (err) {
      logger.error({ err, contactId, caseId }, 'contactsService.unlinkFromCase failed')
      captureError(err)
      throw new DatabaseError('Failed to unlink contact from case', err)
    }
  },

  async getCasesByContact(contactId: string): Promise<LinkedCase[]> {
    try {
      if (!isOnline()) return []

      const supabase = getSupabaseClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(DB_TABLES.caseContacts) as any)
        .select('cases(*)')
        .eq('contact_id', contactId)

      if (error) throw new DatabaseError('Failed to fetch linked cases', error)

      const cases: LinkedCase[] = []
      for (const row of (data ?? []) as Array<{ cases: SupabaseCaseRow | null }>) {
        if (!row.cases || row.cases.is_deleted) continue
        cases.push({
          id: row.cases.id,
          user_id: row.cases.user_id,
          case_number: row.cases.case_number,
          title: row.cases.title,
          client_name: row.cases.client_name,
          client_contact: row.cases.client_contact,
          opposing_party: row.cases.opposing_party,
          court_name: row.cases.court_name,
          judge_name: row.cases.judge_name,
          case_type: row.cases.case_type as LocalCase['case_type'],
          status: row.cases.status as LocalCase['status'],
          description: row.cases.description,
          notes: row.cases.notes,
          filed_date: row.cases.filed_date,
          is_deleted: row.cases.is_deleted,
          deleted_at: row.cases.deleted_at,
          created_at: row.cases.created_at,
          updated_at: row.cases.updated_at,
          _synced: true,
          _dirty: false,
        })
      }

      return cases
    } catch (err) {
      logger.error({ err, contactId }, 'contactsService.getCasesByContact failed')
      captureError(err)
      throw new DatabaseError('Failed to fetch linked cases', err)
    }
  },
}
