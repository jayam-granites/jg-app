import app from './app'
import { env } from './config/env'
import { logger } from './lib/logger'
import { startScheduledWorkers } from './modules/expense-schedules/expense-schedule-worker'

logger.info({ port: env.port, env: env.nodeEnv }, 'Starting server')

const scheduledWorkers = await startScheduledWorkers()
const shutdown = async () => {
  try {
    await scheduledWorkers.stop({ graceful: true })
  } catch (error) {
    logger.error({ err: error }, 'Failed to stop expense schedule worker')
    process.exitCode = 1
  } finally {
    process.exit()
  }
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)

export default {
  port: env.port,
  fetch: app.fetch,
}