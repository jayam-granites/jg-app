import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import type { AppRole } from '@jg-app/shared'
import {
  redactCostFields,
  requirePermission,
  requireRoutePermissions,
  type AuthEnvironment,
} from './authorization'

function createApp(role: AppRole | null) {
  const app = new Hono<AuthEnvironment>()

  app.use('*', async (c, next) => {
    if (role) c.set('user', { id: 'user-1', role })
    await next()
  })

  app.onError((err, c) => {
    const error = err as { statusCode?: number; code?: string; message?: string }
    return c.json(
      { error: { code: error.code ?? 'INTERNAL_ERROR', message: error.message ?? 'Error' } },
      (error.statusCode ?? 500) as 400,
    )
  })

  return app
}

describe('authorization middleware', () => {
  it('returns 401 without a verified user', async () => {
    const app = createApp(null)
    app.use('/reports', requirePermission('reports:read'))
    app.get('/reports', (c) => c.json({ ok: true }))

    const response = await app.request('/reports')
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    })
  })

  it('returns 403 with a clear code when a permission is missing', async () => {
    const app = createApp('sales')
    app.use('/reports', requirePermission('reports:read'))
    app.get('/reports', (c) => c.json({ ok: true }))

    const response = await app.request('/reports')
    expect(response.status).toBe(403)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('FORBIDDEN')
    expect(body.error.message).toContain('reports:read')
  })

  it('allows roles that have the required permission', async () => {
    const app = createApp('admin')
    app.use('/reports', requirePermission('reports:read'))
    app.get('/reports', (c) => c.json({ ok: true }))

    const response = await app.request('/reports')
    expect(response.status).toBe(200)
  })

  it('enforces permissions per HTTP method', async () => {
    const app = createApp('sales')
    app.use(
      '/invoices',
      requireRoutePermissions({ GET: 'billing:read', POST: 'billing:write' }),
    )
    app.get('/invoices', (c) => c.json({ method: 'get' }))
    app.post('/invoices', (c) => c.json({ method: 'post' }))

    expect((await app.request('/invoices')).status).toBe(200)
    expect((await app.request('/invoices', { method: 'POST' })).status).toBe(200)
  })

  it('blocks sales users from cost-control mutations', async () => {
    const app = createApp('sales')
    app.use(
      '/expenses',
      requireRoutePermissions({ GET: 'cost_control:read', POST: 'cost_control:write' }),
    )
    app.get('/expenses', (c) => c.json({ ok: true }))

    expect((await app.request('/expenses')).status).toBe(403)
    expect((await app.request('/expenses', { method: 'POST' })).status).toBe(403)
  })

  it('strips nested cost and balance fields from sales responses', async () => {
    const app = createApp('sales')
    app.use('*', redactCostFields)
    app.get('/data', (c) =>
      c.json({
        data: {
          sellingPrice: 100,
          balanceAmount: 20,
          buyingPrice: 60,
          nested: { landingPrice: 40, margin: 10 },
        },
      }),
    )

    const response = await app.request('/data')
    const body = (await response.json()) as {
      data: Record<string, unknown> & { nested: Record<string, unknown> }
    }
    expect(body.data.sellingPrice).toBe(100)
    expect(body.data.balanceAmount).toBe(20)
    expect(body.data.buyingPrice).toBeUndefined()
    expect(body.data.nested.landingPrice).toBeUndefined()
    expect(body.data.nested.margin).toBeUndefined()
  })

  it('keeps cost fields for roles with cost_control:read', async () => {
    const app = createApp('admin')
    app.use('*', redactCostFields)
    app.get('/data', (c) =>
      c.json({ data: { buyingPrice: 60, sellingPrice: 100 } }),
    )

    const response = await app.request('/data')
    const body = (await response.json()) as { data: Record<string, unknown> }
    expect(body.data).toEqual({ buyingPrice: 60, sellingPrice: 100 })
  })
})
