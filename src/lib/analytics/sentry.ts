import * as Sentry from '@sentry/nextjs'
import { logger } from './logger'

export function initSentry(): void {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  const env = process.env.NEXT_PUBLIC_APP_ENV ?? 'development'

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: env === 'production' ? 0.2 : 1.0,
    debug: env === 'development',
  })
}

export function captureException(err: unknown, context?: Record<string, unknown>): void {
  Sentry.captureException(err, context ? { extra: context } : undefined)
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  logger.error({ err, ...context }, 'Application error captured')
  captureException(err, context)
}

export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
  Sentry.addBreadcrumb(breadcrumb)
}
