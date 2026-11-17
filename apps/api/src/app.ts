import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { api } from '#/routes'
import { authMiddleware } from '#/middleware/auth'
import { errorMiddleware } from '#/middleware/error'
import { loggerMiddleware } from '#/middleware/logger'
import { logger } from '#/lib/logger'
import { env } from '#/config/env'
import { Scalar } from '@scalar/hono-api-reference'
import { createApiDocument } from './api-document'

const app = new Hono()
  .use('/api/*', cors({ origin: env.webOrigin, credentials: true }))
  .use('/api/*', secureHeaders())
  .use('/api/*', loggerMiddleware)
  .use('/api/*', authMiddleware)
  .onError(errorMiddleware)
  .route('/api', api)

app.get('/api/openapi.json', (c) => c.json(createApiDocument(app.routes)))
app.get(
  '/api/reference',
  Scalar({
    url: '/api/openapi.json',
    pageTitle: 'Jayam Granites API Reference',
  }),
)

logger.info('App configured')

export type AppType = typeof app
export default app
