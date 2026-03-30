import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { SecuritySettings } from './_components/security-settings'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Security',
  description: 'Manage your security settings and password.',
}

export default function SecurityPage() {
  return (
    <>
      <PageHeader title="Security" backHref={ROUTES.settings.account} />
      <div className="px-4 md:px-6 py-4">
        <SecuritySettings />
      </div>
    </>
  )
}
