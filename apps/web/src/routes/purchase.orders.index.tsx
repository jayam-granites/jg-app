import { createFileRoute } from '@tanstack/react-router'
import { PurchaseOrdersListPage } from '@/features/purchase-orders/pages/purchase-orders-list-page'

export const Route = createFileRoute('/purchase/orders/')({
  component: PurchaseOrdersListPage,
})
