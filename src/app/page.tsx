import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { getSupabaseServer } from '@/lib/supabase/server'
import { ROUTES } from '@/lib/constants/routes'

export default async function RootPage() {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect(ROUTES.dashboard as Route)
  }

  redirect(ROUTES.auth.login as Route)
}
