export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookSignature,
  parseWebhookOrder,
} from '@/lib/credits/lemonsqueezy'
import { addCredits } from '@/lib/credits/credits'
import { logger, captureError } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  // lemonsqueezy sends signature in X-Signature header
  const signature = req.headers.get('x-signature') ?? ''

  if (!verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Invalid LemonSqueezy webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventName =
    String((payload?.meta as Record<string, unknown> | undefined)?.event_name ?? '')

  logger.info({ event: eventName }, 'LemonSqueezy webhook received')

  // always return 200 after this point (lemonsqueezy retries on non-200 which can cause duplicate credits)
  try {
    switch (eventName) {
      case 'order_created': {
        const status = String(
          (
            (payload?.data as Record<string, unknown> | undefined)
              ?.attributes as Record<string, unknown> | undefined
          )?.status ?? '',
        )

        if (status !== 'paid') {
          logger.info({ status }, 'Order not paid - skipping')
          break
        }

        const order = parseWebhookOrder(payload)
        if (!order) {
          logger.error('Could not parse order')
          break
        }

        // idempotency check (prevent duplicate credit awards)
        const { getSupabaseServer } = await import('@/lib/supabase/server')
        const supabase = await getSupabaseServer()

        const { data: existing } = await supabase
          .from('credit_transactions')
          .select('id')
          .eq('reference', order.orderId)
          .eq('type', 'purchase')
          .single()

        if (existing) {
          logger.info({ orderId: order.orderId }, 'Duplicate webhook - skipping')
          break
        }

        await addCredits(
          order.userId,
          order.credits,
          'purchase',
          order.packageName + ' - ' + order.credits + ' credits',
          order.orderId,
        )

        logger.info(
          { userId: order.userId, credits: order.credits, orderId: order.orderId },
          'Credits added after purchase',
        )
        break
      }

      case 'order_refunded': {
        const order = parseWebhookOrder(payload)
        if (!order) break

        logger.warn(
          { userId: order.userId, orderId: order.orderId, credits: order.credits },
          'Refund received - manual review required. Credits NOT auto-deducted.',
        )
        // do not auto-deduct (credits may already be used)
        // handle manually via dashboard
        break
      }

      default:
        logger.info({ event: eventName }, 'Unhandled LemonSqueezy event')
    }
  } catch (err) {
    captureError(err, { webhook: 'lemonsqueezy', event: eventName })
    // still return 200 to prevent LS retries
  }

  return NextResponse.json({ received: true })
}
