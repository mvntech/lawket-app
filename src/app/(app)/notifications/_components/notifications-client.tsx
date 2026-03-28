'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Briefcase, Bell, CheckCheck, Loader2 } from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ErrorState } from '@/components/shared/error-state'
import { ListSkeleton } from '@/components/shared/loading-skeleton'
import { cn } from '@/lib/utils/cn'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-notifications'
import type { NotificationFilter } from '@/services/notifications.service'
import type { NotificationWithCase } from '@/services/notifications.service'
import { ROUTES } from '@/lib/constants/routes'
import { analytics } from '@/lib/analytics/posthog'
import type { Database } from '@/types/database.types'

// types

type NotificationType = Database['public']['Enums']['notification_type']

// helpers

const PAGE_SIZE = 20

const typeConfig: Record<NotificationType, { icon: React.ReactNode; iconBg: string }> = {
  hearing_reminder: {
    icon: <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  deadline_reminder: {
    icon: <Clock className="h-4 w-4 text-destructive" />,
    iconBg: 'bg-destructive/10',
  },
  case_update: {
    icon: <Briefcase className="h-4 w-4 text-primary" />,
    iconBg: 'bg-primary/10',
  },
  system: {
    icon: <Bell className="h-4 w-4 text-muted-foreground" />,
    iconBg: 'bg-muted',
  },
}

const filters: { label: string; value: NotificationFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Unread', value: 'unread' },
  { label: 'Hearings', value: 'hearing_reminder' },
  { label: 'Deadlines', value: 'deadline_reminder' },
]

function groupByDate(
  notifications: NotificationWithCase[],
): { label: string; items: NotificationWithCase[] }[] {
  const today: NotificationWithCase[] = []
  const yesterday: NotificationWithCase[] = []
  const older: NotificationWithCase[] = []

  for (const n of notifications) {
    const date = new Date(n.sent_at)
    if (isToday(date)) today.push(n)
    else if (isYesterday(date)) yesterday.push(n)
    else older.push(n)
  }

  const groups: { label: string; items: NotificationWithCase[] }[] = []
  if (today.length) groups.push({ label: 'Today', items: today })
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday })
  if (older.length) groups.push({ label: 'Earlier', items: older })
  return groups
}

// component

interface NotificationsClientProps {
  userId: string
}

export function NotificationsClient({ userId }: NotificationsClientProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all')
  const [page, setPage] = useState(0)

  const { data, isLoading, error, refetch } = useNotifications(userId, activeFilter, page)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const notifications = data ?? []
  const hasMore = notifications.length === PAGE_SIZE
  const unreadCount = notifications.filter((n: NotificationWithCase) => !n.is_read).length

  const grouped = useMemo(() => groupByDate(notifications), [notifications])

  const handleMarkAsRead = async (notification: NotificationWithCase) => {
    if (notification.is_read) {
      if (notification.case_id) {
        router.push(ROUTES.cases.detail(notification.case_id) as any)
      }
      return
    }

    await markRead.mutateAsync(notification.id)
    analytics.notificationOpened(notification.type)

    if (notification.case_id) {
      router.push(ROUTES.cases.detail(notification.case_id) as any)
    }
  }

  const handleMarkAllRead = () => {
    markAllRead.mutate(userId, {
      onSuccess: () => {
        analytics.allNotificationsMarkedRead()
      },
    })
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <PageHeader
        title="Notifications"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
            : 'You\'re all caught up'
        }
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="hidden md:inline-flex gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        }
      />

      <div className="flex-1 px-4 md:px-6 pb-6 pt-4 space-y-4">
        <div className="flex items-center gap-2">
          <Select
            value={activeFilter}
            onValueChange={(v) => { setActiveFilter(v as NotificationFilter); setPage(0) }}
          >
            <SelectTrigger className="h-8 text-xs w-auto min-w-[140px]" aria-label="Filter notifications">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filters.map(({ label, value }) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label === 'Unread' && unreadCount > 0 ? `Unread (${unreadCount})` : label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground ml-auto shrink-0">
            {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
          </span>
        </div>

        {isLoading && <ListSkeleton />}
        {error && !isLoading && <ErrorState onRetry={() => refetch()} />}
        {!isLoading && !error && notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            subtitle="You'll receive reminders before your hearings and deadlines."
          />
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <div className="space-y-4">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="px-1 pb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <div className="rounded-lg border bg-card divide-y overflow-hidden">
                  {items.map((notification) => {
                    const { icon, iconBg } = typeConfig[notification.type]
                    return (
                      <button
                        key={notification.id}
                        onClick={() => handleMarkAsRead(notification)}
                        className={cn(
                          'w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/50',
                          !notification.is_read && 'bg-primary/3',
                        )}
                      >
                        <div className="relative mt-0.5 shrink-0">
                          <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', iconBg)}>
                            {icon}
                          </div>
                          {!notification.is_read && (
                            <span
                              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card"
                              aria-hidden="true"
                            />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-sm leading-snug',
                              notification.is_read
                                ? 'font-normal text-foreground'
                                : 'font-semibold text-foreground',
                            )}
                          >
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {notification.body}
                          </p>
                          {notification.cases?.title && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <Briefcase className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                              <span className="text-[10px] text-muted-foreground truncate">
                                {notification.cases.title}
                              </span>
                            </div>
                          )}
                        </div>

                        <span className="shrink-0 text-[11px] text-muted-foreground whitespace-nowrap pt-0.5">
                          {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Load more
            </Button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleMarkAllRead}
        disabled={unreadCount === 0 || markAllRead.isPending}
        className="fixed bottom-20 right-8 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Mark all notifications as read"
      >
        {markAllRead.isPending ? (
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCheck className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
