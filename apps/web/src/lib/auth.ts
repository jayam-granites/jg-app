import {
  hasPermission as hasRolePermission,
  normalizeRole,
  type AppRole,
  type Permission,
} from '@jg-app/shared'
import { api } from './api'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: AppRole
  permissions: readonly Permission[]
}

type MeResponse = {
  data: {
    id: string
    name: string
    email: string
    role: string
    permissions: Permission[]
  }
}

/**
 * Hydrates role information from the backend session endpoint. The server resolves
 * the role from the verified session's database user, never from client storage.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await api.me.$get()
    if (!response.ok) return null

    const payload = (await response.json()) as MeResponse
    const role = normalizeRole(payload.data?.role)
    if (!role) return null

    return {
      id: payload.data.id,
      name: payload.data.name,
      email: payload.data.email,
      role,
      permissions: payload.data.permissions ?? [],
    }
  } catch {
    return null
  }
}

export function formatRoleLabel(role: AppRole | string | null | undefined): string {
  const normalized = normalizeRole(role)
  if (!normalized) return 'Unknown'
  if (normalized === 'superadmin') return 'Super admin'
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

export function hasPermission(user: CurrentUser | null, permission: Permission): boolean {
  return user !== null && hasRolePermission(user.role, permission)
}

export function hasAnyPermission(
  user: CurrentUser | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission))
}

export function hasAllPermissions(
  user: CurrentUser | null,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission))
}

export function defaultRouteFor(
  user: CurrentUser | null,
): '/' | '/invoices' | '/enquiries' | '/tasks' | '/login' {
  if (!user) return '/login'
  if (hasPermission(user, 'reports:read')) return '/'
  if (hasPermission(user, 'billing:read')) return '/invoices'
  if (hasPermission(user, 'enquiries:read')) return '/enquiries'
  return '/tasks'
}
