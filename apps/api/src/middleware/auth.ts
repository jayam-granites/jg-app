import { createMiddleware } from 'hono/factory'
import { normalizeRole } from '@jg-app/shared'
import { auth } from '#/lib/auth'
import { prisma } from '#/lib/prisma'
import type { AuthEnvironment } from './authorization'

export const authMiddleware = createMiddleware<AuthEnvironment>(async (c, next) => {
  if (c.req.path === '/api/health' || c.req.path.startsWith('/api/auth/')) {
    return next()
  }

  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  })
  if (!session) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)
  }

  // The role is resolved from the verified session's database user, never from a request body.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuspended: true, role: true },
  })
  if (!user || user.isSuspended) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Account access is disabled' } }, 401)
  }

  const role = normalizeRole(user.role)
  if (!role) {
    return c.json(
      { error: { code: 'FORBIDDEN', message: 'Account role is missing or invalid' } },
      403,
    )
  }

  c.set('authSession', session)
  c.set('user', { id: session.user.id, role })
  await next()
})
