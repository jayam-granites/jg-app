import { Hono } from 'hono'
import { userRoutes } from '#/modules/users/users.routes'
import { productRoutes } from '#/modules/products/products.routes'
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

const api = new Hono()
  .route('/users', userRoutes)
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
  .get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
  )

export { api }
