import { pinoLogger } from 'hono-pino'
import { createLogger } from '#/lib/logger'

export const loggerMiddleware = pinoLogger({
  pino: createLogger(),
  http: {
    reqId: () => crypto.randomUUID(),
    onResLevel: (c) => {
      if (c.error) return 'error'
      if (c.res.status >= 500) return 'error'
      if (c.res.status >= 400) return 'warn'
      return 'info'
    },
  },
})
