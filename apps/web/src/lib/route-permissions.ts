import type { Permission } from '@jg-app/shared'

type RoutePermission = {
  prefix: string
  permissions: readonly Permission[]
  exact?: boolean
}

export const ROUTE_PERMISSIONS: readonly RoutePermission[] = [
  { prefix: '/', permissions: ['reports:read'], exact: true },
  { prefix: '/enquiries', permissions: ['enquiries:read'] },
  { prefix: '/tasks', permissions: ['enquiries:read'] },
  { prefix: '/crm', permissions: ['enquiries:read'] },
  { prefix: '/resources', permissions: ['enquiries:read'] },
  { prefix: '/measurements', permissions: ['billing:read'] },
  { prefix: '/invoices', permissions: ['billing:read'] },
  { prefix: '/customers', permissions: ['billing:read'] },
  { prefix: '/qr-codes', permissions: ['billing:read'] },
  { prefix: '/reports', permissions: ['reports:read'] },
  { prefix: '/brokers', permissions: ['billing:read'] },
  { prefix: '/transport', permissions: ['billing:read'] },
  { prefix: '/products', permissions: ['catalog:read'] },
  { prefix: '/categories', permissions: ['catalog:read'] },
  { prefix: '/attributes', permissions: ['catalog:read'] },
  { prefix: '/units', permissions: ['catalog:read'] },
  { prefix: '/price-search', permissions: ['cost_control:read'] },
  { prefix: '/inventory', permissions: ['cost_control:read'] },
  { prefix: '/purchase', permissions: ['cost_control:read'] },
  { prefix: '/suppliers', permissions: ['cost_control:read'] },
  { prefix: '/expenses', permissions: ['cost_control:read'] },
  { prefix: '/expense-schedules', permissions: ['cost_control:read'] },
  { prefix: '/accounts', permissions: ['cost_control:read'] },
  { prefix: '/users', permissions: ['users:manage'] },
  { prefix: '/settings', permissions: ['system:manage'] },
  { prefix: '/profile', permissions: [] },
  { prefix: '/forbidden', permissions: [] },
]

/** Returns the permissions needed for a path, or null when the path is ungated. */
export function permissionsForPath(pathname: string): readonly Permission[] | null {
  const path = pathname.replace(/\/+$/, '') || '/'

  const match = ROUTE_PERMISSIONS.find((route) =>
    route.exact
      ? path === route.prefix
      : path === route.prefix || path.startsWith(`${route.prefix}/`),
  )

  return match?.permissions ?? null
}
