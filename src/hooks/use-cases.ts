'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { casesService } from '@/services/cases.service'
import type { CaseModel, GetCasesOptions } from '@/services/cases.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { STALE_TIME_MS, GC_TIME_MS } from '@/lib/constants/app'
import type { CreateCaseInput, UpdateCaseInput } from '@/lib/validations/case.schema'
import { useAuth } from '@/hooks/use-auth'

// read hooks

export function useCases(options?: GetCasesOptions) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.cases.list(options as Record<string, unknown>),
    queryFn: () => casesService.getAll(user!.id, options),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  })
}

export function useCaseDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.cases.detail(id),
    queryFn: () => casesService.getById(id),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    enabled: !!id,
  })
}

export function useCaseStats() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.cases.stats(),
    queryFn: () => casesService.getStats(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  })
}

export function useDeletedCases() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.cases.deleted(),
    queryFn: () => casesService.getDeleted(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  })
}

// mutation hooks

export function useCreateCase() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateCaseInput) => {
      if (!user?.id) throw new Error('Not authenticated')
      return casesService.create(data, user.id)
    },

    onMutate: async (newCaseInput) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cases.all() })
      const previousCases = queryClient.getQueryData<CaseModel[]>(queryKeys.cases.list())

      if (user?.id) {
        const optimistic: CaseModel = {
          id: `optimistic-${Date.now()}`,
          user_id: user.id,
          case_number: newCaseInput.case_number,
          title: newCaseInput.title,
          client_name: newCaseInput.client_name,
          client_contact: newCaseInput.client_contact ?? null,
          opposing_party: newCaseInput.opposing_party ?? null,
          court_name: newCaseInput.court_name ?? null,
          judge_name: newCaseInput.judge_name ?? null,
          case_type: newCaseInput.case_type,
          status: newCaseInput.status,
          description: newCaseInput.description ?? null,
          notes: newCaseInput.notes ?? null,
          filed_date: newCaseInput.filed_date ?? null,
          is_deleted: false,
          deleted_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        }
        queryClient.setQueryData<CaseModel[]>(queryKeys.cases.list(), (old) => [
          optimistic,
          ...(old ?? []),
        ])
      }

      return { previousCases }
    },

    onError: (_err, _vars, context) => {
      if (context?.previousCases !== undefined) {
        queryClient.setQueryData(queryKeys.cases.list(), context.previousCases)
      }
      toast.error('Failed to create case. Please try again.')
    },

    onSuccess: () => {
      toast.success('Case created successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() })
    },
  })
}

export function useUpdateCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCaseInput }) =>
      casesService.update(id, data),

    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cases.all() })

      const previousList = queryClient.getQueryData<CaseModel[]>(queryKeys.cases.list())
      const previousDetail = queryClient.getQueryData<CaseModel | null>(
        queryKeys.cases.detail(id),
      )

      const applyUpdate = (c: CaseModel): CaseModel =>
        c.id === id
          ? {
            ...c,
            ...(Object.fromEntries(
              Object.entries(data).filter(([, v]) => v !== undefined),
            ) as Partial<CaseModel>),
            updated_at: new Date().toISOString(),
            _dirty: true,
          }
          : c

      queryClient.setQueryData<CaseModel[]>(queryKeys.cases.list(), (old) =>
        old ? old.map(applyUpdate) : old,
      )
      queryClient.setQueryData<CaseModel | null>(
        queryKeys.cases.detail(id),
        (old) => (old ? applyUpdate(old) : old),
      )

      return { previousList, previousDetail }
    },

    onError: (_err, { id }, context) => {
      if (context?.previousList !== undefined) {
        queryClient.setQueryData(queryKeys.cases.list(), context.previousList)
      }
      if (context?.previousDetail !== undefined) {
        queryClient.setQueryData(queryKeys.cases.detail(id), context.previousDetail)
      }
      toast.error('Failed to update case. Please try again.')
    },

    onSuccess: () => {
      toast.success('Case updated successfully.')
    },

    onSettled: (_data, _err, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.detail(id) })
    },
  })
}

export function useRestoreCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => casesService.restore(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cases.deleted() })
      const previous = queryClient.getQueryData<CaseModel[]>(queryKeys.cases.deleted())
      queryClient.setQueryData<CaseModel[]>(
        queryKeys.cases.deleted(),
        (old) => (old ? old.filter((c) => c.id !== id) : old),
      )
      return { previous }
    },

    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.cases.deleted(), context.previous)
      }
      toast.error('Failed to restore case. Please try again.')
    },

    onSuccess: () => {
      toast.success('Case restored successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.deleted() })
    },
  })
}

export function usePermanentDeleteCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => casesService.permanentDelete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cases.deleted() })
      const previous = queryClient.getQueryData<CaseModel[]>(queryKeys.cases.deleted())
      queryClient.setQueryData<CaseModel[]>(
        queryKeys.cases.deleted(),
        (old) => (old ? old.filter((c) => c.id !== id) : old),
      )
      return { previous }
    },

    onError: (_err, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(queryKeys.cases.deleted(), context.previous)
      }
      toast.error('Failed to permanently delete case. Please try again.')
    },

    onSuccess: () => {
      toast.success('Case permanently deleted.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.deleted() })
    },
  })
}

export function useSoftDeleteCase() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (id: string) => {
      if (!user?.id) throw new Error('Not authenticated')
      return casesService.softDelete(id, user.id)
    },

    onMutate: async (id) => {
      // cancel all in-flight case queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.cases.all() })

      // snapshot every active list variant (unfiltered, status-filtered, search-filtered)
      // so we can roll them all back on error
      const previousQueries = queryClient.getQueriesData<CaseModel[]>({
        queryKey: ['cases', 'list'],
      })

      // optimistically remove from ALL active list variants at once
      queryClient.setQueriesData<CaseModel[]>(
        { queryKey: ['cases', 'list'] },
        (old) => (old ? old.filter((c) => c.id !== id) : old),
      )

      return { previousQueries }
    },

    onError: (_err, _id, context) => {
      // restore every list variant we snapshotted
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data)
        }
      }
      toast.error('Failed to delete case. Please try again.')
    },

    onSuccess: () => {
      toast.success('Case deleted.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cases.all() })
    },
  })
}
