import app from './app'
import { env } from './config/env'
import { logger } from './lib/logger'

logger.info({ port: env.port, env: env.nodeEnv }, 'Starting server')

export default {
  port: env.port,
  fetch: app.fetch,
}
