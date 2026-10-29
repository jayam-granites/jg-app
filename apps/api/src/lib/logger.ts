import pino from 'pino'
import { env } from '#/config/env'

const pinoInstance = pino({
  level: env.logLevel,
  ...(env.isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }
    : {}),
})

export function createLogger(name?: string) {
  return name ? pinoInstance.child({ name }) : pinoInstance
}

export const logger = createLogger('app')
