'use client'

import { memo } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Clock, CheckCircle, LayoutGrid } from 'lucide-react'
import { StatCard } from '@/components/dashboard/stat-card'
import { useDashboardSummary } from '@/hooks/use-dashboard'
import { ROUTES } from '@/lib/constants/routes'

const EMPTY_STATS = { active: 0, pending: 0, closed: 0, archived: 0, total: 0 }

// component

export const CaseStatsRow = memo(function CaseStatsRow() {
  const router = useRouter()
  const { summary, isLoading } = useDashboardSummary()
  const stats = summary?.caseStats ?? EMPTY_STATS

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <StatCard
        title="Active"
        value={stats.active}
        icon={Briefcase}
        isLoading={isLoading}
        onClick={() => router.push(`${ROUTES.cases.list}?status=active`)}
      />
      <StatCard
        title="Pending"
        value={stats.pending}
        icon={Clock}
        isLoading={isLoading}
        onClick={() => router.push(`${ROUTES.cases.list}?status=pending`)}
      />
      <StatCard
        title="Closed"
        value={stats.closed}
        icon={CheckCircle}
        isLoading={isLoading}
        onClick={() => router.push(`${ROUTES.cases.list}?status=closed`)}
      />
      <StatCard
        title="Total"
        value={stats.total}
        icon={LayoutGrid}
        isLoading={isLoading}
        onClick={() => router.push(ROUTES.cases.list)}
      />
    </div>
  )
})
