import type { MiddlewareHandler } from 'hono'

export const authMiddleware = (): MiddlewareHandler => {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      c.header('WWW-Authenticate', 'Bearer')
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } }, 401)
    }
    await next()
  }
}
