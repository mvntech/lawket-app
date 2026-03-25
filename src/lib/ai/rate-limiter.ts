import { getSupabaseServer } from '@/lib/supabase/server'

const HOURLY_LIMIT = 20

export async function checkRateLimit(
  userId: string,
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const supabase = await getSupabaseServer()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await (supabase as any)
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  const used = (count as number | null) ?? 0
  const remaining = Math.max(0, HOURLY_LIMIT - used)
  const resetAt = new Date(Date.now() + 60 * 60 * 1000)

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
