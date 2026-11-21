import { AsyncLocalStorage } from 'node:async_hooks'
import { PrismaClient, Prisma } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '#/config/env'
import { logger } from '#/lib/logger'

const isDev = process.env.NODE_ENV !== 'production'
// Cloudflare Workers identify themselves through navigator.userAgent.
const isWorker = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'

const requestStorage = new AsyncLocalStorage<PrismaClient>()

function createClient() {
  // The Prisma "client" engine has no Rust binary, so it works on Cloudflare
  // Workers. It requires a driver adapter in every runtime (local Bun included).
  // The pg adapter speaks TCP, which Workers support via the nodejs_compat flag.
  const adapter = new PrismaPg({ connectionString: env.databaseUrl })
  const client = new PrismaClient({
    adapter,
    log: isDev ? [{ emit: 'event', level: 'query' }] : [],
  })

  if (isDev) {
    (client as any).$on('query', (e: Prisma.QueryEvent) => {
      logger.debug({ query: e.query, params: e.params, duration: `${e.duration}ms` }, 'Prisma query')
    })
  }

  return client
}

// Local Bun (dev server, seed, scheduled jobs) keeps one long-lived client.
let standaloneClient: PrismaClient | undefined
function getStandaloneClient() {
  return (standaloneClient ??= createClient())
}

/**
 * Stable import used everywhere in the app. It resolves to the Prisma client
 * bound to the current request when one exists, otherwise to the standalone
 * client. Nothing else in the codebase needs to change.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = requestStorage.getStore() ?? getStandaloneClient()
    const value = Reflect.get(client, property, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
}) as PrismaClient

/**
 * Workers freeze their isolate between requests, which leaves a module-scoped
 * pg Pool holding stale TCP sockets. Queries on those sockets hang until
 * Cloudflare cancels the request ("Worker's code had hung"). Create a fresh
 * client per request and disconnect it before the response finishes.
 */
export async function runWithRequestPrisma<T>(fn: () => Promise<T>): Promise<T> {
  if (!isWorker) {
    return requestStorage.run(getStandaloneClient(), fn)
  }

  const client = createClient()
  try {
    return await requestStorage.run(client, fn)
  } finally {
    try {
      await client.$disconnect()
    } catch (error) {
      logger.error({ err: error }, 'Failed to disconnect request Prisma client')
    }
  }
}
