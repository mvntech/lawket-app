'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardService } from '@/services/dashboard.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { useAuth } from '@/hooks/use-auth'

const SUMMARY_STALE_TIME = 1000 * 60 * 2 // 2 minutes
const ACTIVITY_STALE_TIME = 1000 * 60 * 3 // 3 minutes

export function useDashboardSummary() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.dashboard.summary(user?.id ?? ''),
    queryFn: () => dashboardService.getSummary(user!.id),
    enabled: !!user?.id,
    staleTime: SUMMARY_STALE_TIME,
    refetchOnWindowFocus: true,
  })

  return {
    summary: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}

export function useRecentActivity() {
  const { user } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.dashboard.activity(user?.id ?? ''),
    queryFn: () => dashboardService.getRecentActivity(user!.id),
    enabled: !!user?.id,
    staleTime: ACTIVITY_STALE_TIME,
    refetchOnWindowFocus: true,
  })

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  }
}
