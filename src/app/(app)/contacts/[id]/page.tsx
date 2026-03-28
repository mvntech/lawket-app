import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ContactDetailClient } from './_components/contact-detail-client'
import type { ContactModel } from '@/types/common.types'
import type { Contact } from '@/types/database.types'
import type { ContactRole } from '@/types/common.types'

export const metadata = { title: 'Contact' }

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('contacts') as any)
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (!data) redirect('/contacts')

  const c = data as Contact
  const initialData: ContactModel = {
    id: c.id,
    user_id: c.user_id,
    full_name: c.full_name,
    role: c.role as ContactRole,
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

  return <ContactDetailClient id={id} initialData={initialData} />
}
