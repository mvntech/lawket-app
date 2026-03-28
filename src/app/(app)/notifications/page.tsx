import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { getSupabaseServer } from '@/lib/supabase/server'
import { NotificationsClient } from './_components/notifications-client'

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login' as Route)
  }

  return <NotificationsClient userId={user.id} />
}
