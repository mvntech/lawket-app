import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DocumentsClient } from './_components/documents-client'
import type { DocumentModel } from '@/services/documents.service'
import type { Document } from '@/types/database.types'
import type { DocumentType } from '@/types/common.types'

export const metadata = { title: 'Documents' }

function rowToModel(d: Document): DocumentModel {
  return {
    id: d.id,
    case_id: d.case_id,
    user_id: d.user_id,
    name: d.name,
    file_path: d.file_path,
    file_size: d.file_size,
    mime_type: d.mime_type,
    doc_type: d.doc_type as DocumentType,
    notes: d.notes,
    is_deleted: d.is_deleted,
    deleted_at: d.deleted_at,
    created_at: d.created_at,
    _synced: true,
  }
}

export default async function DocumentsPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('documents') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(200)

  const initialDocuments = ((data as Document[] | null) ?? []).map(rowToModel)

  return (
    <DocumentsClient
      initialDocuments={initialDocuments}
      userId={user.id}
    />
  )
}
