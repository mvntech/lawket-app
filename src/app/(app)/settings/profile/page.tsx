import type { Metadata } from 'next'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileSettings } from './_components/profile-settings'
import { ROUTES } from '@/lib/constants/routes'

export const metadata: Metadata = {
  title: 'Profile',
  description: 'Manage your public profile information.',
}

export default function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" backHref={ROUTES.settings.root} />
      <div className="p-4 md:px-6 max-w-full">
        <ProfileSettings />
      </div>
    </>
  )
}
