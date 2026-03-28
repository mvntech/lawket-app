import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { CasesClient } from './_components/cases-client'
import type { CaseModel } from '@/services/cases.service'
import type { Case } from '@/types/database.types'
import type { CaseStatus, CaseType } from '@/types/common.types'

export const metadata = { title: 'Case Management' }

function rowToModel(c: Case): CaseModel {
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

export default async function CasesPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('cases') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
    .limit(20)

  const rows = (data as Case[] | null) ?? []
  const initialCases = rows.map(rowToModel)

  return <CasesClient initialCases={initialCases} userId={user.id} />
}
