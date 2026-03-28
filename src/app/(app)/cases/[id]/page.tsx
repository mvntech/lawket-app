import { notFound, redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { CaseDetailClient } from './_components/case-detail-client'
import type { CaseModel } from '@/services/cases.service'
import type { Case } from '@/types/database.types'
import type { CaseStatus, CaseType } from '@/types/common.types'

interface CaseDetailPageProps {
  params: Promise<{ id: string }>
}

function rowToModel(row: Case): CaseModel {
  return {
    id: row.id,
    user_id: row.user_id,
    case_number: row.case_number,
    title: row.title,
    client_name: row.client_name,
    client_contact: row.client_contact,
    opposing_party: row.opposing_party,
    court_name: row.court_name,
    judge_name: row.judge_name,
    case_type: row.case_type as CaseType,
    status: row.status as CaseStatus,
    description: row.description,
    notes: row.notes,
    filed_date: row.filed_date,
    is_deleted: row.is_deleted,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    _synced: true,
    _dirty: false,
  }
}

export async function generateMetadata({ params }: CaseDetailPageProps) {
  const { id } = await params
  const supabase = await getSupabaseServer()
  const { data } = await (supabase.from('cases') as any).select('title').eq('id', id).maybeSingle()
  const row = data as Pick<Case, 'title'> | null
  return { title: row ? `${row.title}` : 'Case' }
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params
  const supabase = await getSupabaseServer()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await (supabase.from('cases') as any)
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .maybeSingle()

  const row = data as Case | null
  if (!row) notFound()

  return <CaseDetailClient id={id} initialData={rowToModel(row)} />
}
