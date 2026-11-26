import { Hono } from 'hono'
import { permissionsForRole, type Permission } from '@jg-app/shared'
import { userRoutes } from '#/modules/users/users.routes'
import { productRoutes } from '#/modules/products/products.routes'
import { productImportRoutes } from '#/modules/product-import/product-import.routes'
import { mastersRoutes } from '#/modules/masters/masters.routes'
import { suppliersRoutes } from '#/modules/suppliers/suppliers.routes'
import { brokersRoutes } from '#/modules/brokers/brokers.routes'
import { transportRoutes } from '#/modules/transport/transport.routes'
import { expenseSchedulesRoutes } from '#/modules/expense-schedules/expense-schedules.routes'
import { expensesRoutes } from '#/modules/expenses/expenses.routes'
import { slabsRoutes } from '#/modules/slabs/slabs.routes'
import { measurementsRoutes } from '#/modules/measurements/measurements.routes'
import { customersRoutes } from '#/modules/customers/customers.routes'
import { invoicesRoutes } from '#/modules/invoices/invoices.routes'
import { purchaseOrdersRoutes } from '#/modules/purchase-orders/purchase-orders.routes'
import { purchaseReceiptsRoutes } from '#/modules/purchase-receipts/purchase-receipts.routes'
import { inventoryRoutes } from '#/modules/inventory/inventory.routes'
import { accountsRoutes } from '#/modules/accounts/accounts.routes'
import { dashboardRoutes } from '#/modules/dashboard/dashboard.routes'
import { reportsRoutes } from '#/modules/reports/reports.routes'
import { auth } from '#/lib/auth'
import { settingsRoutes } from '#/modules/settings/settings.routes'
import { upiProfilesRoutes } from '#/modules/upi-profiles/upi-profiles.routes'
import { resourcesRoutes } from '#/modules/resources/resources.routes'
import { enquiriesRoutes } from '#/modules/enquiries/enquiries.routes'
import { tasksRoutes } from '#/modules/tasks/tasks.routes'
import { crmRoutes } from '#/modules/crm/crm.routes'
import {
  redactCostFields,
  requirePermission,
  requireRoutePermissions,
  type AuthEnvironment,
} from '#/middleware/authorization'

const readWrite = (read: Permission, write: Permission) =>
  requireRoutePermissions({ GET: read, POST: write, PUT: write, PATCH: write, DELETE: write })

const api = new Hono<AuthEnvironment>()
  // Any JSON response for a sales user is stripped of cost, margin and balance data.
  .use('*', redactCostFields)
  .all('/auth/*', (c) => auth.handler(c.req.raw))
  .get('/me', (c) => {
    const user = c.get('user')
    const session = c.get('authSession')
    return c.json({
      data: {
        id: user.id,
        name: session.user.name,
        email: session.user.email,
        role: user.role,
        permissions: permissionsForRole(user.role),
      },
    })
  })
  .use('/users/*', requirePermission('users:manage'))
  .use('/settings/*', requirePermission('system:manage'))
  .use('/dashboard/*', requirePermission('reports:read'))
  .use('/reports/*', requirePermission('reports:read'))
  .use('/enquiries/*', readWrite('enquiries:read', 'enquiries:write'))
  .use('/enquiries/:id/follow-ups', requirePermission('enquiries:follow_up'))
  .use('/tasks/*', readWrite('enquiries:read', 'enquiries:write'))
  .use('/crm/*', requirePermission('enquiries:read'))
  .use('/resources/*', readWrite('enquiries:read', 'enquiries:write'))
  .use('/customers/*', readWrite('billing:read', 'billing:write'))
  .use('/measurements/*', readWrite('billing:read', 'billing:write'))
  .use('/slabs/*', readWrite('billing:read', 'billing:write'))
  .use('/invoices/*', readWrite('billing:read', 'billing:write'))
  .use('/upi-profiles/*', readWrite('billing:read', 'billing:write'))
  .use('/brokers/*', requireRoutePermissions({
    GET: 'billing:read',
    POST: 'billing:write',
    PUT: 'billing:write',
  }))
  .use('/transport/*', requireRoutePermissions({
    GET: 'billing:read',
    POST: 'billing:write',
    PUT: 'billing:write',
  }))
  .use('/products/*', readWrite('catalog:read', 'cost_control:write'))
  .use('/masters/*', readWrite('catalog:read', 'catalog:write'))
  .use('/suppliers/*', readWrite('cost_control:read', 'cost_control:write'))
  .use('/expenses/*', readWrite('cost_control:read', 'cost_control:write'))
  .use('/expense-schedules/*', readWrite('cost_control:read', 'cost_control:write'))
  .use('/purchase-orders/*', readWrite('cost_control:read', 'cost_control:write'))
  .use('/purchase-receipts/*', readWrite('cost_control:read', 'cost_control:write'))
  .use('/inventory/*', readWrite('cost_control:read', 'cost_control:write'))
  // Account statements are reports; the plain account list is readable for billing selection.
  .use('/accounts/:id/statement', requirePermission('reports:read'))
  .use('/accounts/*', requireRoutePermissions({
    GET: 'billing:read',
    POST: 'cost_control:write',
    PUT: 'cost_control:write',
    DELETE: 'cost_control:write',
  }))
  .route('/users', userRoutes)
  .route('/products/import', productImportRoutes)
  .route('/products', productRoutes)
  .route('/masters', mastersRoutes)
  .route('/suppliers', suppliersRoutes)
  .route('/brokers', brokersRoutes)
  .route('/transport', transportRoutes)
  .route('/expense-schedules', expenseSchedulesRoutes)
  .route('/expenses', expensesRoutes)
  .route('/slabs', slabsRoutes)
  .route('/measurements', measurementsRoutes)
  .route('/customers', customersRoutes)
  .route('/invoices', invoicesRoutes)
  .route('/purchase-orders', purchaseOrdersRoutes)
  .route('/purchase-receipts', purchaseReceiptsRoutes)
  .route('/inventory', inventoryRoutes)
  .route('/accounts', accountsRoutes)
  .route('/dashboard', dashboardRoutes)
  .route('/reports', reportsRoutes)
  .route('/settings', settingsRoutes)
  .route('/upi-profiles', upiProfilesRoutes)
  .route('/resources', resourcesRoutes)
  .route('/enquiries', enquiriesRoutes)
  .route('/tasks', tasksRoutes)
  .route('/crm', crmRoutes)
  .get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
  )

export { api }
