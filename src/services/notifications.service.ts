import { getSupabaseClient } from '@/lib/supabase/client'
import { createTableHelper } from '@/lib/db/service-utils'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { DatabaseError } from '@/types/common.types'
import type { NotificationLog } from '@/types/database.types'
import { logger, captureError } from '@/lib/analytics'

// types

export interface NotificationWithCase extends NotificationLog {
  cases: { title: string } | null
}

export type NotificationFilter = 'all' | 'unread' | 'hearing_reminder' | 'deadline_reminder'

const PAGE_SIZE = 20

// supabase typed helper

const notifLogsFrom = createTableHelper(DB_TABLES.notificationLogs)

// service

export const notificationsService = {
  async getAll(
    userId: string,
    filter: NotificationFilter = 'all',
    page = 0,
  ): Promise<NotificationWithCase[]> {
    try {
      const supabase = getSupabaseClient()
      let query = notifLogsFrom(supabase)
        .select('*, cases(title)')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      if (filter === 'unread') {
        query = query.eq('is_read', false)
      } else if (filter === 'hearing_reminder' || filter === 'deadline_reminder') {
        query = query.eq('type', filter)
      }

      const { data, error } = await query
      if (error) throw new DatabaseError('Failed to fetch notifications', error)
      return (data ?? []) as NotificationWithCase[]
    } catch (err) {
      logger.error({ err, userId }, 'notificationsService.getAll failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to fetch notifications', err)
    }
  },

  async getUnreadCount(userId: string): Promise<number> {
    try {
      const supabase = getSupabaseClient()
      const { count, error } = await notifLogsFrom(supabase)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw new DatabaseError('Failed to fetch unread count', error)
      return count ?? 0
    } catch (err) {
      logger.error({ err, userId }, 'notificationsService.getUnreadCount failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to fetch unread count', err)
    }
  },

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await notifLogsFrom(supabase)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw new DatabaseError('Failed to mark notification as read', error)
    } catch (err) {
      logger.error({ err, notificationId }, 'notificationsService.markAsRead failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to mark notification as read', err)
    }
  },

  async markAllAsRead(userId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient()
      const { error } = await notifLogsFrom(supabase)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw new DatabaseError('Failed to mark all notifications as read', error)
    } catch (err) {
      logger.error({ err, userId }, 'notificationsService.markAllAsRead failed')
      captureError(err)
      throw err instanceof DatabaseError ? err : new DatabaseError('Failed to mark all notifications as read', err)
    }
  },
}
