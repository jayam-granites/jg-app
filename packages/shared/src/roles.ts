export const ROLES = ['sales', 'manager', 'admin', 'super_admin'] as const

export type AppRole = (typeof ROLES)[number]

export function isAppRole(role: string | null | undefined): role is AppRole {
  return ROLES.some((candidate) => candidate === role)
}

export const ROLE_HIERARCHY: Record<AppRole, number> = {
  sales: 10,
  manager: 20,
  admin: 30,
  super_admin: 40,
}

export function hasMinimumRole(callerRole: AppRole, requiredRole: AppRole): boolean {
  return ROLE_HIERARCHY[callerRole] >= ROLE_HIERARCHY[requiredRole]
}

export function hasAnyRole(callerRole: AppRole, allowedRoles: readonly AppRole[]): boolean {
  return allowedRoles.includes(callerRole)
}
