import type { Metadata } from 'next'
import { DeletedCasesClient } from './_components/deleted-cases-client'

export const metadata: Metadata = {
  title: 'Deleted Cases',
  description: 'View and restore cases you have previously deleted.',
}

export default function DeletedCasesPage() {
  return <DeletedCasesClient />
}
