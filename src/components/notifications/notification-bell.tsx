'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { setupNotificationListener } from '@/lib/supabase/realtime'
import { useUnreadNotificationCount } from '@/hooks/use-notifications'
import { queryKeys } from '@/lib/constants/query-keys'
import { ROUTES } from '@/lib/constants/routes'
import { logger } from '@/lib/analytics'

// types

interface NotificationBellProps {
  userId: string
  className?: string
}

// component

export function NotificationBell({ userId, className }: NotificationBellProps) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId)

  // realtime subscription (invalidate on new notification)
  useEffect(() => {
    if (!userId) return

    const cleanup = setupNotificationListener(userId, () => {
      queryClient
        .invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() })
        .catch((err) => logger.warn({ err }, 'Failed to invalidate notification count'))

      // play subtle notification sound if tab is visible
      if (document.visibilityState === 'visible') {
        new Audio('/sounds/notification.mp3').play().catch(() => {
          // autoplay blocked or file missing - silent fallback
        })
      }
    })

    return cleanup
  }, [userId, queryClient])

  const displayCount = unreadCount > 9 ? '9+' : unreadCount

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('relative', className)}
      onClick={() => router.push(ROUTES.notifications)}
      aria-label={
        unreadCount > 0
          ? `Notifications - ${unreadCount} unread`
          : 'Notifications'
      }
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          className={cn(
            'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center',
            'rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground',
            'animate-[pulse_2s_ease-in-out_infinite]',
          )}
          aria-hidden="true"
        >
          {displayCount}
        </span>
      )}
    </Button>
  )
}
