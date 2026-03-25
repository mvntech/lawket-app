import pino from 'pino'

export const logger = pino({
  level: process.env.NEXT_PUBLIC_APP_ENV === 'development' ? 'debug' : 'info',
  browser: { asObject: true },
  serializers: { err: pino.stdSerializers.err },
  base: { env: process.env.NEXT_PUBLIC_APP_ENV ?? 'development', app: 'lawket' },
})
