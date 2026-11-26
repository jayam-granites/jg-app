import { ROLES, ROLE_HIERARCHY, type AppRole } from './roles'

export const PERMISSIONS = [
  'enquiries:read',
  'enquiries:write',
  'enquiries:follow_up',
  'billing:read',
  'billing:write',
  'catalog:read',
  'catalog:write',
  'cost_control:read',
  'cost_control:write',
  'reports:read',
  'reports:export',
  'users:manage',
  'system:manage',
  'audit:read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const salesPermissions: readonly Permission[] = [
  'enquiries:read',
  'enquiries:write',
  'enquiries:follow_up',
  'billing:read',
  'billing:write',
  'catalog:read',
]

const adminPermissions: readonly Permission[] = [
  ...salesPermissions,
  'catalog:write',
  'cost_control:read',
  'cost_control:write',
  'reports:read',
  'reports:export',
]

const superadminPermissions: readonly Permission[] = [...PERMISSIONS]

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  sales: salesPermissions,
  admin: adminPermissions,
  superadmin: superadminPermissions,
}

export const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  manager: 'admin',
  super_admin: 'superadmin',
}

export function normalizeRole(value: string | null | undefined): AppRole | null {
  if (!value) return null
  const role = value.trim().toLowerCase()
  if ((ROLES as readonly string[]).includes(role)) return role as AppRole
  return LEGACY_ROLE_ALIASES[role] ?? null
}

export function hasPermission(
  role: AppRole | string | null | undefined,
  permission: Permission,
): boolean {
  const normalized = normalizeRole(role)
  return normalized !== null && ROLE_PERMISSIONS[normalized].includes(permission)
}

export function hasAllPermissions(
  role: AppRole | string | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(role, permission))
}

export function hasAnyPermission(
  role: AppRole | string | null | undefined,
  permissions: readonly Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(role, permission))
}

export function permissionsForRole(role: AppRole | string | null | undefined): readonly Permission[] {
  const normalized = normalizeRole(role)
  return normalized ? ROLE_PERMISSIONS[normalized] : []
}

export function canManageRole(
  callerRole: AppRole | string | null | undefined,
  targetRole: AppRole | string | null | undefined,
): boolean {
  const caller = normalizeRole(callerRole)
  const target = normalizeRole(targetRole)
  if (!caller || !target) return false
  if (!hasPermission(caller, 'users:manage')) return false
  return ROLE_HIERARCHY[caller] >= ROLE_HIERARCHY[target]
}

export type AuthenticatedUser = {
  id: string
  role: AppRole
}
