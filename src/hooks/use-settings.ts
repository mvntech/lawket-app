'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { settingsService } from '@/services/settings.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { getErrorMessage } from '@/lib/utils/error'
import { useAuth } from '@/hooks/use-auth'
import { analytics } from '@/lib/analytics/posthog'
import type { UpdateProfileInput } from '@/lib/validations/profile.schema'

export function useProfile() {
  const { user } = useAuth()

  return useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: () => settingsService.getProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => settingsService.updateProfile(user!.id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
      analytics.profileUpdated()
      toast.success('Profile updated.')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useUpdateAvatar() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => settingsService.updateAvatar(user!.id, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.me() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.auth.user() })
      analytics.avatarUpdated()
      toast.success('Avatar updated.')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (newPassword: string) => settingsService.changePassword(newPassword),
    onSuccess: () => {
      analytics.passwordChanged()
      toast.success('Password changed.')
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useDeleteAccount() {
  const { user } = useAuth()

  return useMutation({
    mutationFn: () => settingsService.deleteAccount(user!.id),
    onSuccess: () => {
      analytics.accountDeleted()
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}

export function useSignOut() {
  const { signOut } = useAuth()

  return useMutation({
    mutationFn: () => signOut(),
    onMutate: () => {
      analytics.signOutClicked()
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })
}
