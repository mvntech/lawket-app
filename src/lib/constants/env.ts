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
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    env: process.env.NEXT_PUBLIC_APP_ENV as 'development' | 'staging' | 'production',
    isDev: process.env.NEXT_PUBLIC_APP_ENV === 'development',
    isProd: process.env.NEXT_PUBLIC_APP_ENV === 'production',
  },
} as const

export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  ]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
