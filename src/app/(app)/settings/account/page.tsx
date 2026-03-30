import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { AccountSettings } from './_components/account-settings'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Account',
  description: 'Manage your Lawket account settings and subscription.',
}

export default function AccountPage() {
  return (
    <>
      <PageHeader title="Account" backHref={ROUTES.settings.root} />
      <div className="p-4 md:px-6 max-w-full">
        <AccountSettings />
      </div>
    </>
  )
}
