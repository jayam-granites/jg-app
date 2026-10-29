import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '#/lib/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const isDev = process.env.NODE_ENV !== 'production'

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isDev ? [{ emit: 'event', level: 'query' }] : [],
  })

if (isDev) {
  globalForPrisma.prisma = prisma
}

// Log all Prisma queries in development for debugging
if (isDev) {
  (prisma as any).$on('query', (e: Prisma.QueryEvent) => {
    logger.debug({ query: e.query, params: e.params, duration: `${e.duration}ms` }, 'Prisma query')
  })
}

