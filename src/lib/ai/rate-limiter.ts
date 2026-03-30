import { getSupabaseServer } from '@/lib/supabase/server'

const DAILY_LIMIT = 20

function getStartOfTodayUTC(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function getStartOfTomorrowUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const supabase = await getSupabaseServer()
  const startOfToday = getStartOfTodayUTC()

  const { count } = await (supabase as any)
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfToday)

  const used = (count as number | null) ?? 0
  const remaining = Math.max(0, DAILY_LIMIT - used)
  const resetAt = getStartOfTomorrowUTC()

  return {
    allowed: remaining > 0,
    remaining,
    resetAt,
  }
}

export async function trackUsage(
  userId: string,
  feature: string,
  tokensUsed: number,
): Promise<void> {
  const supabase = await getSupabaseServer()
  await (supabase as any).from('ai_usage').insert({
    user_id: userId,
    feature,
    tokens_used: tokensUsed,
  })
}
