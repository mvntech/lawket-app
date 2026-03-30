export const ENV = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  sentry: {
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN!,
  },
  posthog: {
    key: process.env.NEXT_PUBLIC_POSTHOG_KEY!,
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST!,
  },
  vapid: {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    privateKey: process.env.VAPID_PRIVATE_KEY!,
    subject: process.env.VAPID_SUBJECT!,
  },
  anthropic: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.AI_MODEL!,
  },
  lemonsqueezy: {
    apiKey: process.env.LEMONSQUEEZY_API_KEY!,
    storeId: process.env.LEMONSQUEEZY_STORE_ID!,
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET!,
    variants: {
      starter: process.env.LEMONSQUEEZY_VARIANT_STARTER!,
      standard: process.env.LEMONSQUEEZY_VARIANT_STANDARD!,
      pro: process.env.LEMONSQUEEZY_VARIANT_PRO!,
    },
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    env: process.env.NEXT_PUBLIC_APP_ENV as 'development' | 'staging' | 'production',
    isDev: process.env.NEXT_PUBLIC_APP_ENV === 'development',
    isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production',
  },
} as const

export function validateEnv() {
  // client-accessible vars - checked on every boot
  const clientRequired = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  ]

  // server-only vars - checked only in server/edge runtimes where typeof window is undefined
  const serverRequired =
    typeof window === 'undefined'
      ? [
        'VAPID_PRIVATE_KEY',
        'VAPID_SUBJECT',
        'GEMINI_API_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]
      : []

  const missing = [...clientRequired, ...serverRequired].filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
