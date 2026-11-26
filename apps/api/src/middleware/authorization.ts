import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'
import {
  hasPermission,
  normalizeRole,
  type AuthenticatedUser,
  type Permission,
  type AppRole,
} from '@jg-app/shared'
import { ForbiddenError } from '#/lib/errors'
import type { auth } from '#/lib/auth'

type AuthSession = typeof auth.$Infer.Session

export type AuthEnvironment = {
  Variables: {
    authSession: AuthSession
    user: AuthenticatedUser
  }
}

type AuthorizedContext = Context<AuthEnvironment>

const unauthorized = (c: AuthorizedContext) =>
  c.json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, 401)

function authorize(c: AuthorizedContext, permissions: readonly Permission[]) {
  const user = c.get('user') as AuthenticatedUser | undefined
  if (!user) return unauthorized(c)

  const allowed = permissions.some((permission) => hasPermission(user.role, permission))
  if (!allowed) {
    const list = permissions.join(' or ')
    throw new ForbiddenError(`You do not have permission to access this resource (${list})`)
  }
  return null
}

export const requirePermission = (...permissions: Permission[]) =>
  createMiddleware<AuthEnvironment>(async (c, next) => {
    const denied = authorize(c, permissions)
    if (denied) return denied
    await next()
  })

export const requireRole = (...roles: AppRole[]) =>
  createMiddleware<AuthEnvironment>(async (c, next) => {
    const user = c.get('user') as AuthenticatedUser | undefined
    if (!user) return unauthorized(c)
    if (!roles.includes(user.role)) {
      throw new ForbiddenError(`This action requires one of these roles: ${roles.join(', ')}`)
    }
    await next()
  })

type MethodPermissions = Partial<Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', Permission>>

export const requireRoutePermissions = (grant: MethodPermissions) =>
  createMiddleware<AuthEnvironment>(async (c, next) => {
    const permission = grant[c.req.method as keyof MethodPermissions]
    if (!permission) return next()
    const denied = authorize(c, [permission])
    if (denied) return denied
    await next()
  })

const SENSITIVE_FIELDS = new Set([
  // Purchase cost and margin data.
  'buyingPrice',
  'landingPrice',
  'costPrice',
  'purchaseRate',
  'purchaseCost',
  'materialCost',
  'vendorCost',
  'unitCost',
  'cost',
  'margin',
  'marginPercentage',
  'profit',
  'profitPercentage',
  'stockValue',
  // Account balances are finance controls; invoice balanceAmount is intentional billing data.
  'balance',
  'currentBalance',
  'openingBalance',
  'availableBalance',
  'accountBalance',
])

export function stripSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitiveFields)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !SENSITIVE_FIELDS.has(key))
        .map(([key, child]) => [key, stripSensitiveFields(child)]),
    )
  }
  return value
}

export const redactCostFields = createMiddleware<AuthEnvironment>(async (c, next) => {
  await next()

  const user = c.get('user') as AuthenticatedUser | undefined
  if (!user || hasPermission(user.role, 'cost_control:read')) return

  const response = c.res
  if (!response || response.status < 200 || response.status >= 300) return
  if (!(response.headers.get('content-type') ?? '').includes('application/json')) return

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return
  }

  const headers = new Headers(response.headers)
  headers.delete('content-length')
  c.res = new Response(JSON.stringify(stripSensitiveFields(payload)), {
    status: response.status,
    headers,
  })
})

export function resolveRole(value: string | null | undefined): AppRole | null {
  return normalizeRole(value)
}
