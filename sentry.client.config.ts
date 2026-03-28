import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  // 10% traces in production, 100% in development
  tracesSampleRate:
    process.env.NEXT_PUBLIC_APP_ENV === 'production' ? 0.1 : 1.0,

  // session replay
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  enabled: process.env.NEXT_PUBLIC_APP_ENV !== 'development',

  // strip sensitive data
  beforeSend(event) {
    // remove user email from events
    if (event.user) {
      delete event.user.email
      delete event.user.username
      delete event.user.ip_address
    }
    // remove auth tokens from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /token=[^&]*/g,
        'token=REDACTED'
      )
    }
    return event
  },

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
})
