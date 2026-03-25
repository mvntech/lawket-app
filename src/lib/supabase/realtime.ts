import { getSupabaseClient } from '@/lib/supabase/client'
import { logger } from '@/lib/analytics'

// notification listener

export function setupNotificationListener(
  userId: string,
  onNewNotification: (notification: Record<string, unknown>) => void,
): () => void {
  const supabase = getSupabaseClient()

  const channel = supabase
    .channel(`notification-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_logs',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        logger.info({ userId }, 'New notification received via realtime')
        onNewNotification(payload.new as Record<string, unknown>)
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel).catch((err) => {
      logger.warn({ err }, 'Failed to remove realtime channel')
    })
  }
}
