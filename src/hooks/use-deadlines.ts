'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deadlinesService } from '@/services/deadlines.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import { queryKeys } from '@/lib/constants/query-keys'
import type { CreateDeadlineInput, UpdateDeadlineInput } from '@/lib/validations/deadline.schema'
import { useAuth } from '@/hooks/use-auth'

const DEADLINES_STALE_TIME = 1000 * 60 * 2 // 2 minutes

// read hooks

export function useDeadlinesByCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.deadlines.byCase(caseId),
    queryFn: () => deadlinesService.getByCase(caseId),
    enabled: !!caseId,
    staleTime: DEADLINES_STALE_TIME,
  })
}

export function useUpcomingDeadlines(days?: number) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.deadlines.upcoming(days),
    queryFn: () => deadlinesService.getUpcoming(user!.id, days),
    enabled: !!user?.id,
    staleTime: DEADLINES_STALE_TIME,
  })
}

export function useOverdueDeadlines() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.deadlines.overdue(),
    queryFn: () => deadlinesService.getOverdue(user!.id),
    enabled: !!user?.id,
    staleTime: DEADLINES_STALE_TIME,
  })
}

// mutation hooks

export function useCreateDeadline() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateDeadlineInput) => {
      if (!user?.id) throw new Error('Not authenticated')
      return deadlinesService.create(data, user.id)
    },

    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deadlines.all() })
      const previousByCase = queryClient.getQueryData<DeadlineModel[]>(
        queryKeys.deadlines.byCase(input.case_id),
      )

      if (user?.id) {
        const optimistic: DeadlineModel = {
          id: `optimistic-${Date.now()}`,
          case_id: input.case_id,
          user_id: user.id,
          title: input.title,
          due_date: input.due_date,
          due_time: input.due_time ?? null,
          priority: input.priority,
          is_completed: false,
          completed_at: null,
          notes: input.notes ?? null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        }
        queryClient.setQueryData<DeadlineModel[]>(
          queryKeys.deadlines.byCase(input.case_id),
          (old) => [...(old ?? []), optimistic],
        )
      }

      return { previousByCase }
    },

    onError: (_err, input, context) => {
      if (context?.previousByCase !== undefined) {
        queryClient.setQueryData(
          queryKeys.deadlines.byCase(input.case_id),
          context.previousByCase,
        )
      }
      toast.error('Failed to add deadline. Please try again.')
    },

    onSuccess: () => {
      toast.success('Deadline added successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.all() })
    },
  })
}

export function useUpdateDeadline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeadlineInput }) =>
      deadlinesService.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deadlines.all() })

      const previousQueries = queryClient.getQueriesData<DeadlineModel[]>({
        queryKey: queryKeys.deadlines.all(),
      })

      const applyUpdate = (d: DeadlineModel): DeadlineModel =>
        d.id === id
          ? {
              ...d,
              ...(Object.fromEntries(
                Object.entries(data).filter(([, v]) => v !== undefined),
              ) as Partial<DeadlineModel>),
              updated_at: new Date().toISOString(),
              _dirty: true,
            }
          : d

      queryClient.setQueriesData<DeadlineModel[]>(
        { queryKey: queryKeys.deadlines.all() },
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
      toast.error('Failed to update deadline. Please try again.')
    },

    onSuccess: () => {
      toast.success('Deadline updated successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.all() })
    },
  })
}

export function useMarkDeadlineComplete() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deadlinesService.markComplete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deadlines.all() })

      const previousQueries = queryClient.getQueriesData<DeadlineModel[]>({
        queryKey: queryKeys.deadlines.all(),
      })

      const now = new Date().toISOString()
      queryClient.setQueriesData<DeadlineModel[]>(
        { queryKey: queryKeys.deadlines.all() },
        (old) =>
          Array.isArray(old)
            ? old.map((d) =>
                d.id === id
                  ? { ...d, is_completed: true, completed_at: now, _dirty: true }
                  : d,
              )
            : old,
      )

      return { previousQueries }
    },

    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to complete deadline. Please try again.')
    },

    onSuccess: () => {
      toast.success('Deadline marked as complete.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.all() })
    },
  })
}

export function useSoftDeleteDeadline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deadlinesService.softDelete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.deadlines.all() })

      const previousQueries = queryClient.getQueriesData<DeadlineModel[]>({
        queryKey: queryKeys.deadlines.all(),
      })

      queryClient.setQueriesData<DeadlineModel[]>(
        { queryKey: queryKeys.deadlines.all() },
        (old) => (Array.isArray(old) ? old.filter((d) => d.id !== id) : old),
      )

      return { previousQueries }
    },

    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to delete deadline. Please try again.')
    },

    onSuccess: () => {
      toast.success('Deadline deleted.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deadlines.all() })
    },
  })
}
