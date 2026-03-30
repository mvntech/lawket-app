import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { AppearanceSettings } from './_components/appearance-settings'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Appearance',
  description: 'Customize the aesthetic of your Lawket experience.',
}

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
