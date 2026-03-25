'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { contactsService } from '@/services/contacts.service'
import type { ContactModel, GetContactsOptions, LinkedCase } from '@/services/contacts.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { STALE_TIME_MS } from '@/lib/constants/app'
import type { CreateContactInput, UpdateContactInput } from '@/lib/validations/contact.schema'
import { useAuth } from '@/hooks/use-auth'

export type { ContactModel, GetContactsOptions, LinkedCase }

// read hooks

export function useContacts(options?: GetContactsOptions) {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.contacts.all(options),
    queryFn: () => contactsService.getAll(user!.id, options),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
  })
}

export function useContactDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => contactsService.getById(id),
    enabled: !!id,
    staleTime: STALE_TIME_MS,
  })
}

export function useContactsByCase(caseId: string) {
  return useQuery({
    queryKey: queryKeys.contacts.byCase(caseId),
    queryFn: () => contactsService.getByCase(caseId),
    enabled: !!caseId,
    staleTime: STALE_TIME_MS,
  })
}

// mutation hooks

export function useCreateContact() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateContactInput) => {
      if (!user?.id) throw new Error('Not authenticated')
      return contactsService.create(data, user.id)
    },

    onMutate: async (newContactInput) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.all() })
      const previousContacts = queryClient.getQueryData<ContactModel[]>(queryKeys.contacts.all())

      if (user?.id) {
        const optimistic: ContactModel = {
          id: `optimistic-${Date.now()}`,
          user_id: user.id,
          full_name: newContactInput.full_name,
          role: newContactInput.role,
          email: newContactInput.email || null,
          phone: newContactInput.phone || null,
          organization: newContactInput.organization || null,
          notes: newContactInput.notes || null,
          is_deleted: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          _synced: false,
          _dirty: true,
        }

        queryClient.setQueryData<ContactModel[]>(queryKeys.contacts.all(), (old = []) => [
          ...old,
          optimistic,
        ])
      }

      return { previousContacts }
    },

    onError: (_, __, context) => {
      if (context?.previousContacts !== undefined) {
        queryClient.setQueryData(queryKeys.contacts.all(), context.previousContacts)
      }
      toast.error('Failed to add contact.')
    },

    onSuccess: () => {
      toast.success('Contact added successfully.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all() })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContactInput }) =>
      contactsService.update(id, data),

    onError: () => {
      toast.error('Failed to update contact.')
    },

    onSuccess: (updated) => {
      toast.success('Contact updated.')
      queryClient.setQueryData<ContactModel>(queryKeys.contacts.detail(updated.id), updated)
    },

    onSettled: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all() })
      if (updated) {
        queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(updated.id) })
      }
    },
  })
}

export function useSoftDeleteContact() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => contactsService.softDelete(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.contacts.all() })
      const previousContacts = queryClient.getQueryData<ContactModel[]>(queryKeys.contacts.all())

      queryClient.setQueryData<ContactModel[]>(queryKeys.contacts.all(), (old = []) =>
        old.filter((c) => c.id !== id),
      )

      return { previousContacts }
    },

    onError: (_, __, context) => {
      if (context?.previousContacts !== undefined) {
        queryClient.setQueryData(queryKeys.contacts.all(), context.previousContacts)
      }
      toast.error('Failed to remove contact.')
    },

    onSuccess: () => {
      toast.success('Contact removed.')
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all() })
    },
  })
}

export function useLinkContactToCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, caseId }: { contactId: string; caseId: string }) =>
      contactsService.linkToCase(contactId, caseId),

    onSuccess: (_, { contactId, caseId }) => {
      toast.success('Contact linked to case.')
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.byCase(caseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.casesByContact(contactId) })
    },

    onError: () => {
      toast.error('Failed to link contact.')
    },
  })
}

export function useUnlinkContactFromCase() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ contactId, caseId }: { contactId: string; caseId: string }) =>
      contactsService.unlinkFromCase(contactId, caseId),

    onSuccess: (_, { contactId, caseId }) => {
      toast.success('Contact unlinked.')
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.byCase(caseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.casesByContact(contactId) })
    },

    onSettled: (_, __, { contactId, caseId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.byCase(caseId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.casesByContact(contactId) })
    },

    onError: () => {
      toast.error('Failed to unlink contact.')
    },
  })
}

export function useCasesByContact(contactId: string) {
  return useQuery({
    queryKey: queryKeys.contacts.casesByContact(contactId),
    queryFn: () => contactsService.getCasesByContact(contactId),
    enabled: !!contactId,
    staleTime: STALE_TIME_MS,
  })
}
