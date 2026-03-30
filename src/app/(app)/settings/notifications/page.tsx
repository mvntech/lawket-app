import type { Metadata } from 'next'
import { NotificationsClient } from './notifications-client'

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Configure your hearing and deadline reminders and push notification settings.',
}

export default function NotificationSettingsPage() {
  return <NotificationsClient />
}
