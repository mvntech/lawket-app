import { PageHeader } from '@/components/shared/page-header'
import { AppearanceSettings } from './_components/appearance-settings'
import { ROUTES } from '@/lib/constants/routes'

export default function AppearancePage() {
  return (
    <>
      <PageHeader title="Appearance" backHref={ROUTES.settings.root} />
      <div className="p-4 md:px-6 max-w-full">
        <AppearanceSettings />
      </div>
    </>
  )
}
