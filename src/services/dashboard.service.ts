import { getSupabaseClient } from '@/lib/supabase/client'
import { DB_TABLES } from '@/lib/constants/db-tables'
import { casesService } from '@/services/cases.service'
import type { CaseStats } from '@/services/cases.service'
import { hearingsService } from '@/services/hearings.service'
import type { HearingModel } from '@/services/hearings.service'
import { deadlinesService } from '@/services/deadlines.service'
import type { DeadlineModel } from '@/services/deadlines.service'
import { logger, captureError } from '@/lib/analytics'

// supabase typed helpers

type SupabaseClient = ReturnType<typeof getSupabaseClient>
function auditLogsFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.auditLogs)
}
function notifLogsFrom(supabase: SupabaseClient): any {
  return supabase.from(DB_TABLES.notificationLogs)
}

// types

export interface DashboardSummary {
  caseStats: CaseStats
  upcomingHearings: HearingModel[]
  overdueDeadlines: DeadlineModel[]
  upcomingDeadlines: DeadlineModel[]
  todayHearings: HearingModel[]
  tomorrowHearings: HearingModel[]
}

export type ActivityType =
  | 'case_created'
  | 'case_updated'
  | 'hearing_added'
  | 'deadline_added'
  | 'deadline_completed'
  | 'document_uploaded'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  subtitle: string
  caseId?: string
  caseName?: string
  timestamp: string
  icon: string
}

interface AuditLogRow {
  id: number
  user_id: string | null
  action: string
  table_name: string
  record_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface NotificationLogRow {
  id: string
  user_id: string
  case_id: string | null
  title: string
  body: string
  type: string
  reference_id: string | null
  is_read: boolean
  read_at: string | null
  sent_at: string
}

// mappers

function mapAuditLogToActivity(row: AuditLogRow): ActivityItem {
  const newValues = row.new_values ?? {}
  const title = String(newValues.title ?? '')
  const caseId = String(newValues.id ?? row.record_id ?? '')

  switch (row.action) {
    case 'case.created':
      return {
        id: String(row.id),
        type: 'case_created',
        title: 'Case created',
        subtitle: title,
        caseId,
        caseName: title,
        timestamp: row.created_at,
        icon: 'Briefcase',
      }
    case 'case.updated':
      return {
        id: String(row.id),
        type: 'case_updated',
        title: 'Case updated',
        subtitle: title,
        caseId,
        caseName: title,
        timestamp: row.created_at,
        icon: 'Pencil',
      }
    default:
      return {
        id: String(row.id),
        type: 'case_updated',
        title: row.action.replace('.', ' '),
        subtitle: title,
        caseId: caseId || undefined,
        timestamp: row.created_at,
        icon: 'Activity',
      }
  }
}

function mapNotificationLogToActivity(row: NotificationLogRow): ActivityItem {
  switch (row.type) {
    case 'hearing_reminder':
      return {
        id: row.id,
        type: 'hearing_added',
        title: 'Hearing reminder',
        subtitle: row.body,
        caseId: row.case_id ?? undefined,
        timestamp: row.sent_at,
        icon: 'Calendar',
      }
    case 'deadline_reminder':
      return {
        id: row.id,
        type: 'deadline_added',
        title: 'Deadline reminder',
        subtitle: row.body,
        caseId: row.case_id ?? undefined,
        timestamp: row.sent_at,
        icon: 'Clock',
      }
    case 'case_update':
      return {
        id: row.id,
        type: 'case_updated',
        title: row.title,
        subtitle: row.body,
        caseId: row.case_id ?? undefined,
        timestamp: row.sent_at,
        icon: 'Pencil',
      }
    default:
      return {
        id: row.id,
        type: 'case_updated',
        title: row.title,
        subtitle: row.body,
        caseId: row.case_id ?? undefined,
        timestamp: row.sent_at,
        icon: 'Activity',
      }
  }
}

const EMPTY_STATS: CaseStats = { active: 0, pending: 0, closed: 0, archived: 0, total: 0 }

const EMPTY_SUMMARY: DashboardSummary = {
  caseStats: EMPTY_STATS,
  upcomingHearings: [],
  overdueDeadlines: [],
  upcomingDeadlines: [],
  todayHearings: [],
  tomorrowHearings: [],
}

// service

export const dashboardService = {
  async getSummary(userId: string): Promise<DashboardSummary> {
    try {
      const [caseStats, upcomingHearings, overdueDeadlines, upcomingDeadlines] = await Promise.all([
        casesService.getStats(userId).catch((err) => {
          logger.error({ err, userId }, 'dashboardService.getSummary: getStats failed')
          return EMPTY_STATS
        }),
        hearingsService.getUpcoming(userId, 7).catch((err) => {
          logger.error({ err, userId }, 'dashboardService.getSummary: getUpcoming hearings failed')
          return [] as HearingModel[]
        }),
        deadlinesService.getOverdue(userId).catch((err) => {
          logger.error({ err, userId }, 'dashboardService.getSummary: getOverdue failed')
          return [] as DeadlineModel[]
        }),
        deadlinesService.getUpcoming(userId, 7).catch((err) => {
          logger.error({ err, userId }, 'dashboardService.getSummary: getUpcoming deadlines failed')
          return [] as DeadlineModel[]
        }),
      ])

      const todayStr = new Date().toISOString().split('T')[0]
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]

      const todayHearings = upcomingHearings.filter((h) => h.hearing_date === todayStr)
      const tomorrowHearings = upcomingHearings.filter((h) => h.hearing_date === tomorrowStr)

      return {
        caseStats,
        upcomingHearings,
        overdueDeadlines,
        upcomingDeadlines,
        todayHearings,
        tomorrowHearings,
      }
    } catch (err) {
      logger.error({ err, userId }, 'dashboardService.getSummary failed')
      captureError(err)
      return EMPTY_SUMMARY
    }
  },

  async getRecentActivity(userId: string, limit = 10): Promise<ActivityItem[]> {
    try {
      const supabase = getSupabaseClient()

      const { data: auditData, error: auditError } = await auditLogsFrom(supabase)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (auditError) {
        logger.error({ err: auditError, userId }, 'dashboardService.getRecentActivity: audit_logs query failed')
      }

      const auditItems: ActivityItem[] = (auditData as AuditLogRow[] ?? []).map(mapAuditLogToActivity)

      // fallback to notification_logs if audit_logs is sparse
      if (auditItems.length < limit) {
        const remaining = limit - auditItems.length
        const { data: notifData } = await notifLogsFrom(supabase)
          .select('*')
          .eq('user_id', userId)
          .order('sent_at', { ascending: false })
          .limit(remaining)

        const notifItems: ActivityItem[] = (notifData as NotificationLogRow[] ?? []).map(
          mapNotificationLogToActivity,
        )
        return [...auditItems, ...notifItems]
      }

      return auditItems
    } catch (err) {
      logger.error({ err, userId }, 'dashboardService.getRecentActivity failed')
      captureError(err)
      return []
    }
  },
}
