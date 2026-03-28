import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { getSupabaseServer } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const supabase = await getSupabaseServer()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count } = await (supabase as any)
    .from('ai_usage')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo)

  return NextResponse.json({ used: (count as number | null) ?? 0, limit: 20 })
}
