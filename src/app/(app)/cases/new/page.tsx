import { PageHeader } from '@/components/shared/page-header'
import { CaseForm } from '@/components/cases/case-form'
import { ROUTES } from '@/lib/constants/routes'

export const metadata = { title: 'New Case' }

export default function NewCasePage() {
  return (
    <div className="flex flex-col">
      <PageHeader title="New Case" backHref={ROUTES.cases.list} />
      <div className="flex-1 px-4 md:px-6 py-6">
        <div className="max-w-full mx-auto">
          <CaseForm mode="create" />
        </div>
      </div>
    </div>
  )
}
