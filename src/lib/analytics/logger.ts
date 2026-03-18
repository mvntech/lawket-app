import pino from 'pino'

export const logger = pino({
  browser: { asObject: true },
  level: process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'debug' : 'info',
  base: {
    env: process.env.NEXT_PUBLIC_APP_ENV ?? 'development',
    app: 'lawket',
  },
})
