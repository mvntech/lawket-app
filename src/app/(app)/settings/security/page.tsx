import { PageHeader } from '@/components/shared/page-header'
import { SecuritySettings } from './_components/security-settings'
import { ROUTES } from '@/lib/constants/routes'

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
