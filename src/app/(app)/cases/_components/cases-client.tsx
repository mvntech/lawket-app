'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CaseCard } from '@/components/cases/case-card'
import { CaseFilterBar } from '@/components/cases/case-filter-bar'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { useCases } from '@/hooks/use-cases'
import { casesService } from '@/services/cases.service'
import type { CaseModel } from '@/services/cases.service'
import { ROUTES } from '@/lib/constants/routes'
import type { CaseStatus, CaseType } from '@/types/common.types'

// types

type StatusFilter = CaseStatus | 'all'
type TypeFilter = CaseType | 'all'

interface CasesClientProps {
  initialCases: CaseModel[]
  userId: string
}

// components

export function CasesClient({ initialCases, userId: _userId }: CasesClientProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeStatus, setActiveStatus] = useState<StatusFilter>('all')
  const [activeType, setActiveType] = useState<TypeFilter>('all')

  // seed dexie on first mount with server-fetched data
  useEffect(() => {
    if (initialCases.length > 0) {
      casesService.seedFromServer(initialCases).catch(() => undefined)
    }
  }, [initialCases])

  const queryOptions = {
    ...(activeStatus !== 'all' ? { status: activeStatus } : {}),
    ...(activeType !== 'all' ? { caseType: activeType } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  }

  const { data: cases, isLoading, error, refetch } = useCases(queryOptions)

  const displayCases = cases ?? (isLoading ? undefined : initialCases)

  const handleSearchChange = useCallback((s: string) => setSearch(s), [])
  const handleStatusChange = useCallback((s: StatusFilter) => setActiveStatus(s), [])
  const handleTypeChange = useCallback((t: TypeFilter) => setActiveType(t), [])

  const isFiltered = activeStatus !== 'all' || activeType !== 'all' || search.trim() !== ''

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title="Cases"
        subtitle="Manage your cases and track their progress"
        action={
          <Button
            onClick={() => router.push(ROUTES.cases.new)}
            size="sm"
            variant="outline"
            className="hidden md:flex"
          >
            <Plus className="h-4 w-4" />
            Add case
          </Button>
        }
      />

      <div className="flex-1 px-4 md:px-6 pb-6 md:pb-6 space-y-4 pt-4">
        <CaseFilterBar
          onSearchChange={handleSearchChange}
          onStatusChange={handleStatusChange}
          onTypeChange={handleTypeChange}
          activeStatus={activeStatus}
          activeType={activeType}
          totalCount={displayCases?.length ?? 0}
        />

        {isLoading && !displayCases ? (
          <ListSkeleton count={5} />
        ) : error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : !displayCases || displayCases.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon={Search}
              title="No cases match your search"
              subtitle="Try adjusting your filters."
            />
          ) : (
            <EmptyState
              icon={Briefcase}
              title="No cases yet"
              subtitle="Add your first case to get started."
              ctaLabel="Add case"
              onCta={() => router.push(ROUTES.cases.new)}
            />
          )
        ) : (
          <div className="grid gap-3">
            {displayCases.map((c) => (
              <CaseCard
                key={c.id}
                case={c}
                onClick={() => router.push(ROUTES.cases.detail(c.id))}
              />
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.push(ROUTES.cases.new)}
        className="fixed bottom-20 z-50 right-8 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Add case"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  )
}
