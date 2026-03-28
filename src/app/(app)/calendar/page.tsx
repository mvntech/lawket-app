import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { CalendarClient } from './_components/calendar-client'
import type { CaseModel } from '@/services/cases.service'
import type { Case } from '@/types/database.types'
import type { CaseStatus, CaseType } from '@/types/common.types'

export const metadata = { title: 'Calendar' }

function rowToCaseModel(c: Case): CaseModel {
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

export default async function CalendarPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: casesData } = await (supabase.from('cases') as any)
    .select('id, user_id, case_number, title, client_name, client_contact, opposing_party, court_name, judge_name, case_type, status, description, notes, filed_date, is_deleted, deleted_at, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('title', { ascending: true })
    .limit(100)

  const initialCases = ((casesData as Case[] | null) ?? []).map(rowToCaseModel)

  return <CalendarClient userId={user.id} initialCases={initialCases} />
}
