import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ContactsClient } from './_components/contacts-client'
import type { ContactModel } from '@/types/common.types'
import type { Contact } from '@/types/database.types'
import type { ContactRole } from '@/types/common.types'

export const metadata = { title: 'Contacts' }

function rowToModel(c: Contact): ContactModel {
  return {
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
}

export default async function ContactsPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data } = await (supabase.from('contacts') as any)
    .select('*')
    .eq('user_id', user.id)
    .eq('is_deleted', false)
    .order('full_name', { ascending: true })
    .limit(100)

  const rows = (data as Contact[] | null) ?? []
  const initialContacts = rows.map(rowToModel)

  return <ContactsClient initialContacts={initialContacts} />
}
