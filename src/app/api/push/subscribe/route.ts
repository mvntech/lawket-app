import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logger } from '@/lib/analytics'
import type { Json } from '@/types/database.types'

// follows the established codebase pattern (see cases.service.ts - supabase update)
// parameter resolves to 'never' without this helper
function profilesFrom(supabase: any): any {
  return supabase.from('profiles')
}

// rate limit: max 5 subscribe requests per user per hour
// in-memory; best-effort in serverless (resets per cold start)
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) return true

  entry.count++
  return false
}

// POST /api/push/subscribe

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { subscription, userId } = body as {
      subscription: PushSubscriptionJSON
      userId: string
    }

    // validate presence of required fields
    if (!userId || !subscription?.endpoint || !subscription?.keys) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // verify authenticated user matches requested userId
    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.id !== userId) {
      logger.warn({ requestedUserId: userId, actualUserId: user.id }, 'Push subscribe userId mismatch')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // rate limit check (max 5 per user per hour)
    if (isRateLimited(user.id)) {
      logger.warn({ userId: user.id }, 'Push subscribe rate limit exceeded')
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // save subscription to profiles (cast to Json [supabase jsonb type])
    const { error: dbError } = await profilesFrom(supabase)
      .update({ push_subscription: subscription as unknown as Json })
      .eq('id', userId)

    if (dbError) {
      logger.error({ err: dbError, userId }, 'Failed to save push subscription to DB')
      Sentry.captureException(dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.info({ userId }, 'Push subscription saved')
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'POST /api/push/subscribe error')
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/push/subscribe

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { userId } = body as { userId: string }

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabase = await getSupabaseServer()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: dbError } = await profilesFrom(supabase)
      .update({ push_subscription: null })
      .eq('id', userId)

    if (dbError) {
      logger.error({ err: dbError, userId }, 'Failed to clear push subscription')
      Sentry.captureException(dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.info({ userId }, 'Push subscription removed')
    return NextResponse.json({ success: true })
  } catch (err) {
    logger.error({ err }, 'DELETE /api/push/subscribe error')
    Sentry.captureException(err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
