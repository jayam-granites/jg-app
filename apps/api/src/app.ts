import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { api } from '#/routes'
import { errorMiddleware } from '#/middleware/error'
import { loggerMiddleware } from '#/middleware/logger'
import { logger } from '#/lib/logger'

const app = new Hono()
  .use('/api/*', cors())
  .use('/api/*', secureHeaders())
  .use('/api/*', loggerMiddleware)
  .onError(errorMiddleware)
  .route('/api', api)

logger.info('App configured')

export type AppType = typeof app
export default app
