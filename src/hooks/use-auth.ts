'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { Provider } from '@supabase/supabase-js'
import { authService } from '@/services/auth.service'
import { queryKeys } from '@/lib/constants/query-keys'
import { ROUTES } from '@/lib/constants/routes'
import { getErrorMessage } from '@/lib/utils/error'
import { useUiStore } from '@/stores/ui.store'
import { useSyncStore } from '@/stores/sync.store'

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: queryKeys.auth.session(),
    queryFn: authService.getSession,
    staleTime: 1000 * 60 * 5,
  })

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: queryKeys.auth.user(),
    queryFn: authService.getUser,
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  })

  const isLoading = sessionLoading || (!!session && userLoading)
  const isAuthenticated = !!session

  const signIn = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.signIn(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
      router.push(ROUTES.dashboard)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  const signUp = useMutation({
    mutationFn: ({
      email,
      password,
      fullName,
    }: {
      email: string
      password: string
      fullName: string
    }) => authService.signUp(email, password, fullName),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session() })
      router.push(ROUTES.dashboard)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  const signInWithOAuth = useMutation({
    mutationFn: (provider: Extract<Provider, 'google' | 'github'>) =>
      authService.signInWithOAuth(provider),
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  const signOut = useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      useUiStore.setState({ activeModal: null })
      useSyncStore.setState({ pendingCount: 0, lastSyncedAt: null, isSyncing: false })
      queryClient.clear()
      router.push(ROUTES.auth.login)
    },
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  const resetPassword = useMutation({
    mutationFn: ({ email }: { email: string }) => authService.resetPassword(email),
    onError: (err) => {
      toast.error(getErrorMessage(err))
    },
  })

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    signIn: signIn.mutateAsync,
    signInStatus: signIn.status,
    signUp: signUp.mutateAsync,
    signUpStatus: signUp.status,
    signInWithOAuth: signInWithOAuth.mutateAsync,
    signInWithOAuthStatus: signInWithOAuth.status,
    signOut: signOut.mutateAsync,
    signOutStatus: signOut.status,
    resetPassword: resetPassword.mutateAsync,
    resetPasswordStatus: resetPassword.status,
  }
}
