'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { notificationsService } from '@/services/notifications.service'
import type { NotificationFilter } from '@/services/notifications.service'
import { queryKeys } from '@/lib/constants/query-keys'

export function useNotifications(
  userId: string,
  filter: NotificationFilter = 'all',
  page = 0,
) {
  return useQuery({
    queryKey: queryKeys.notifications.all({ filter, page }),
    queryFn: () => notificationsService.getAll(userId, filter, page),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })
}

export function useUnreadNotificationCount(userId: string) {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.getUnreadCount(userId),
    enabled: !!userId,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (notificationId: string) => notificationsService.markAsRead(notificationId),
    onError: () => {
      toast.error('Failed to mark notification as read.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => notificationsService.markAllAsRead(userId),
    onError: () => {
      toast.error('Failed to mark all notifications as read.')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
    },
  })
}
