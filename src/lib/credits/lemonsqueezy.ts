// server-side only (never import in client components)

import {
  lemonSqueezySetup,
  createCheckout,
} from '@lemonsqueezy/lemonsqueezy.js'
import crypto from 'crypto'
import { logger } from '@/lib/analytics'

function init(): void {
  lemonSqueezySetup({
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    onError: (err) => {
      logger.error({ err }, 'LemonSqueezy SDK error')
    },
  })
}

export async function createCheckoutUrl(params: {
  variantId: string
  userId: string
  userEmail: string
  userName: string
  packageName: string
  credits: number
  pricePKR: number
}): Promise<string> {
  init()

  const storeId = parseInt(process.env.LEMONSQUEEZY_STORE_ID!)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const { data, error } = await createCheckout(storeId, parseInt(params.variantId), {
    checkoutOptions: {
      embed: false,
      media: false,
      logo: true,
    },
    checkoutData: {
      email: params.userEmail,
      name: params.userName,
      custom: {
        user_id: params.userId,
        package_name: params.packageName,
        credits: String(params.credits),
        price_pkr: String(params.pricePKR),
      },
    },
    productOptions: {
      name: 'Lawket ' + params.packageName + ' Credits',
      description:
        params.credits + ' AI credits for Lawket. 1 credit = Rs 50 value.',
      redirectUrl: appUrl + '/dashboard?payment=success',
      receiptButtonText: 'Back to Lawket',
      receiptThankYouNote:
        'Your ' +
        params.credits +
        ' AI credits have been added to your Lawket account.',
      enabledVariants: [parseInt(params.variantId)],
    },
    expiresAt: null,
  })

  if (error) {
    logger.error({ error, params }, 'LemonSqueezy checkout creation failed')
    throw new Error('Failed to create checkout: ' + error.message)
  }

  const url = data?.data?.attributes?.url
  if (!url) {
    throw new Error('No checkout URL in response')
  }

  return url
}

// verify HMAC SHA256 signature (lemonsqueezy sends X-Signature header)
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!signature) return false

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!

  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
  } catch {
    return false
  }
}

interface WebhookOrderResult {
  orderId: string
  userId: string
  packageName: string
  credits: number
  status: string
  userEmail: string
}

// parse webhook payload safely
export function parseWebhookOrder(payload: Record<string, unknown>): WebhookOrderResult | null {
  try {
    const attrs = (payload?.data as Record<string, unknown> | undefined)
      ?.attributes as Record<string, unknown> | undefined
    const custom = (payload?.meta as Record<string, unknown> | undefined)
      ?.custom_data as Record<string, unknown> | undefined

    if (!custom?.user_id) {
      logger.error({ custom }, 'No user_id in webhook custom data')
      return null
    }

    const credits = parseInt(String(custom.credits ?? '0'))
    if (isNaN(credits) || credits <= 0) {
      logger.error({ custom }, 'Invalid credits in webhook')
      return null
    }

    return {
      orderId: String((payload?.data as Record<string, unknown> | undefined)?.id ?? ''),
      userId: String(custom.user_id),
      packageName: String(custom.package_name ?? 'Unknown'),
      credits,
      status: String(attrs?.status ?? ''),
      userEmail: String(attrs?.user_email ?? ''),
    }
  } catch (err) {
    logger.error({ err }, 'Failed to parse webhook payload')
    return null
  }
}
