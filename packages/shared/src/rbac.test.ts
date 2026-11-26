import { describe, expect, it } from 'bun:test'
import {
  canManageRole,
  hasAnyPermission,
  hasPermission,
  normalizeRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from './rbac'
import { ROLES } from './roles'

describe('RBAC roles', () => {
  it('uses exactly sales, admin and superadmin', () => {
    expect(ROLES).toEqual(['sales', 'admin', 'superadmin'])
  })

  it('normalizes legacy role values', () => {
    expect(normalizeRole('sales')).toBe('sales')
    expect(normalizeRole('admin')).toBe('admin')
    expect(normalizeRole('super_admin')).toBe('superadmin')
    expect(normalizeRole('manager')).toBe('admin')
    expect(normalizeRole('unknown')).toBeNull()
    expect(normalizeRole(null)).toBeNull()
  })
})

describe('RBAC permission boundaries', () => {
  it('grants sales only enquiry, billing and catalog read access', () => {
    const sales = new Set(ROLE_PERMISSIONS.sales)
    expect(sales).toEqual(
      new Set([
        'enquiries:read',
        'enquiries:write',
        'enquiries:follow_up',
        'billing:read',
        'billing:write',
        'catalog:read',
      ]),
    )
    expect(hasPermission('sales', 'billing:write')).toBe(true)
    expect(hasPermission('sales', 'reports:read')).toBe(false)
    expect(hasPermission('sales', 'cost_control:read')).toBe(false)
    expect(hasPermission('sales', 'users:manage')).toBe(false)
    expect(hasPermission('sales', 'system:manage')).toBe(false)
  })

  it('grants admin reports and cost control but not governance', () => {
    expect(hasPermission('admin', 'reports:read')).toBe(true)
    expect(hasPermission('admin', 'reports:export')).toBe(true)
    expect(hasPermission('admin', 'cost_control:read')).toBe(true)
    expect(hasPermission('admin', 'cost_control:write')).toBe(true)
    expect(hasPermission('admin', 'users:manage')).toBe(false)
    expect(hasPermission('admin', 'system:manage')).toBe(false)
  })

  it('grants superadmin every permission', () => {
    expect(new Set(ROLE_PERMISSIONS.superadmin)).toEqual(new Set(PERMISSIONS))
    expect(hasPermission('superadmin', 'system:manage')).toBe(true)
    expect(hasPermission('superadmin', 'audit:read')).toBe(true)
  })

  it('normalizes roles before checking permissions', () => {
    expect(hasPermission('super_admin', 'system:manage')).toBe(true)
    expect(hasAnyPermission('manager', ['cost_control:write', 'users:manage'])).toBe(true)
    expect(hasPermission('', 'billing:read')).toBe(false)
    expect(hasPermission(undefined, 'billing:read')).toBe(false)
  })
})

describe('canManageRole', () => {
  it('restricts role assignment to governance users without escalation', () => {
    expect(canManageRole('superadmin', 'admin')).toBe(true)
    expect(canManageRole('superadmin', 'superadmin')).toBe(true)
    expect(canManageRole('admin', 'sales')).toBe(false)
    expect(canManageRole('sales', 'sales')).toBe(false)
    expect(canManageRole('unknown', 'sales')).toBe(false)
  })
})
