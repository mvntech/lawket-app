import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = { title: 'Dashboard' }
import type { Route } from 'next'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DashboardClient } from './_components/dashboard-client'

export default async function DashboardPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login' as Route)
  }

  return <DashboardClient />
}
