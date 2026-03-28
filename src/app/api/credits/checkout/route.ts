export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/ai/auth-helper'
import { createCheckoutUrl } from '@/lib/credits/lemonsqueezy'
import { CREDIT_PACKAGES } from '@/lib/credits/constants'
import { addCredits } from '@/lib/credits/credits'
import { getSupabaseServer } from '@/lib/supabase/server'
import { logger, captureError } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  const { userId, errorResponse } = await getAuthenticatedUser()
  if (!userId) return errorResponse!

  const body = (await req.json()) as { packageId?: string }
  const { packageId } = body

  if (!packageId) {
    return NextResponse.json({ error: 'packageId is required' }, { status: 400 })
  }

  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  }

  // dev bypass (when variant IDs not configured) - simulate purchase for testing
  // Uses NODE_ENV (server-only, never client-exposed) to prevent accidental
  // activation in staging/production due to a misconfigured NEXT_PUBLIC_APP_ENV.
  if (process.env.NODE_ENV === 'development' && !pkg.variantId) {
    const newBalance = await addCredits(
      userId,
      pkg.credits,
      'purchase',
      '[DEV] ' + pkg.name + ' - ' + pkg.credits + ' credits',
      'dev-' + Date.now(),
    )

    logger.info({ userId, credits: pkg.credits }, '[DEV] Credits bypass applied')

    return NextResponse.json({
      checkoutUrl:
        (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000') +
        '/dashboard?payment=success&credits=' +
        pkg.credits,
      devMode: true,
      credits: pkg.credits,
      newBalance,
    })
  }

  // require variant ID in non-dev
  if (!pkg.variantId) {
    logger.error({ packageId }, 'LemonSqueezy variant ID not configured')
    return NextResponse.json(
      { error: 'Payment not configured. Contact support.' },
      { status: 500 },
    )
  }

  // get user profile for checkout
  const supabase = await getSupabaseServer()
  const profileResult = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', userId)
    .single()
  const profile = profileResult.data as { full_name: string; email: string } | null

  try {
    const checkoutUrl = await createCheckoutUrl({
      variantId: pkg.variantId,
      userId,
      userEmail: profile?.email ?? '',
      userName: profile?.full_name ?? 'Lawyer',
      packageName: pkg.name,
      credits: pkg.credits,
      pricePKR: pkg.pricePKR,
    })

    logger.info({ userId, packageId, credits: pkg.credits }, 'Checkout URL created')

    return NextResponse.json({
      checkoutUrl,
      packageName: pkg.name,
      credits: pkg.credits,
      pricePKR: pkg.pricePKR,
      priceUSD: pkg.priceUSD,
    })
  } catch (err) {
    captureError(err, { feature: 'checkout', packageId })
    return NextResponse.json(
      { error: 'Failed to create checkout. Please try again.' },
      { status: 500 },
    )
  }
}
