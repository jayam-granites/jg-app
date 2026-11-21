import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '#/config/env'
import { logger } from '#/lib/logger'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const isDev = process.env.NODE_ENV !== 'production'

// The Prisma "client" engine has no Rust binary, so it works on Cloudflare
// Workers. It requires a driver adapter in every runtime (local Bun included).
// The pg adapter speaks TCP, which Workers support via the nodejs_compat flag.
const adapter = new PrismaPg({ connectionString: env.databaseUrl })

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
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
