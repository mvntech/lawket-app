import type { Metadata } from 'next'
import { CreditsClient } from './credits-client'

export const metadata: Metadata = {
  title: 'Credits',
  description: 'Manage your Lawket AI credits, view transaction history, and earn rewards.',
}

export default function CreditsSettingsPage() {
  return <CreditsClient />
}
