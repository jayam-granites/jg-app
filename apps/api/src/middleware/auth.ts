import { createMiddleware } from 'hono/factory'
import { auth } from '#/lib/auth'
import { prisma } from '#/lib/prisma'

type AuthSession = typeof auth.$Infer.Session

type AuthEnvironment = {
  Variables: {
    authSession: AuthSession
  }
}

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isSuspended: true },
  })
  if (!user || user.isSuspended) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: 'Account access is disabled' } }, 401)
  }

  c.set('authSession', session)
  await next()
})
