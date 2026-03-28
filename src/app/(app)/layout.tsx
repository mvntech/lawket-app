import { redirect } from 'next/navigation'
import type { Route } from 'next'
import { getSupabaseServer } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { UpdateNotification } from '@/components/pwa/update-notification'
import { PurchaseModalProvider } from '@/components/credits/purchase-modal-provider'
import { ROUTES } from '@/lib/constants/routes'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.auth.login as Route)
  }

  return (
    <>
      <UpdateNotification />
      <AppShell>{children}</AppShell>
      <InstallPrompt />
      <PurchaseModalProvider />
    </>
  )
}
