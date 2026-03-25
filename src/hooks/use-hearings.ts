'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { hearingsService } from '@/services/hearings.service'
import type { HearingModel } from '@/services/hearings.service'
import { queryKeys } from '@/lib/constants/query-keys'
import type { CreateHearingInput, UpdateHearingInput } from '@/lib/validations/hearing.schema'
import { useAuth } from '@/hooks/use-auth'

const HEARINGS_STALE_TIME = 1000 * 60 * 2 // 2 minutes

// read hooks

export function useHearingsByCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.hearings.byCase(caseId),
    queryFn: () => hearingsService.getByCase(caseId),
    enabled: !!caseId,
    staleTime: HEARINGS_STALE_TIME,
  })
}

export function useUpcomingHearings(days?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.hearings.upcoming(days),
    queryFn: () => hearingsService.getUpcoming(user!.id, days),
    enabled: !!user?.id,
    staleTime: HEARINGS_STALE_TIME,
  })
}

export function useHearingsByDateRange(from: Date, to: Date) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.hearings.range(from, to),
    queryFn: () => hearingsService.getByDateRange(user!.id, from, to),
    enabled: !!user?.id,
    staleTime: HEARINGS_STALE_TIME,
  })
}

// mutation hooks

export function useCreateHearing() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateHearingInput) => {
      if (!user?.id) throw new Error('Not authenticated')
      return hearingsService.create(data, user.id)
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.hearings.all() })
      const previousByCase = queryClient.getQueryData<HearingModel[]>(
        queryKeys.hearings.byCase(input.case_id),
      )

      if (user?.id) {
        const optimistic: HearingModel = {
          id: `optimistic-${Date.now()}`,
          case_id: input.case_id,
          user_id: user.id,
          title: input.title,
          hearing_date: input.hearing_date,
          hearing_time: input.hearing_time ?? null,
          court_name: input.court_name ?? null,
          court_room: input.court_room ?? null,
          judge_name: input.judge_name ?? null,
          notes: input.notes ?? null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        }
        queryClient.setQueryData<HearingModel[]>(
          queryKeys.hearings.byCase(input.case_id),
          (old) => [...(old ?? []), optimistic],
        )
      }

      return { previousByCase }
    },

    onError: (_err, input, context) => {
      if (context?.previousByCase !== undefined) {
        queryClient.setQueryData(queryKeys.hearings.byCase(input.case_id), context.previousByCase)
      }
      toast.error('Failed to add hearing. Please try again.')
    },

    onSuccess: () => {
      toast.success('Hearing added successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hearings.all() })
    },
  })
}

export function useUpdateHearing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateHearingInput }) =>
      hearingsService.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.hearings.all() })

      // snapshot all hearing query data for rollback
      const previousQueries = queryClient.getQueriesData<HearingModel[]>({
        queryKey: queryKeys.hearings.all(),
      })

      const applyUpdate = (h: HearingModel): HearingModel =>
        h.id === id
          ? {
            ...h,
            ...(Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined),
            ) as Partial<HearingModel>),
            updated_at: new Date().toISOString(),
            _dirty: true,
          }
          : h

      queryClient.setQueriesData<HearingModel[]>(
        { queryKey: queryKeys.hearings.all() },
        (old) => (Array.isArray(old) ? old.map(applyUpdate) : old),
      )

      return { previousQueries }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to update hearing. Please try again.')
    },

    onSuccess: () => {
      toast.success('Hearing updated successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hearings.all() })
    },
  })
}

export function useSoftDeleteHearing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => hearingsService.softDelete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.hearings.all() })

      const previousQueries = queryClient.getQueriesData<HearingModel[]>({
        queryKey: queryKeys.hearings.all(),
      })

      queryClient.setQueriesData<HearingModel[]>(
        { queryKey: queryKeys.hearings.all() },
        (old) => (Array.isArray(old) ? old.filter((h) => h.id !== id) : old),
      )

      return { previousQueries }
    },

    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to remove hearing. Please try again.')
    },

    onSuccess: () => {
      toast.success('Hearing removed.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.hearings.all() })
    },
  })
}
