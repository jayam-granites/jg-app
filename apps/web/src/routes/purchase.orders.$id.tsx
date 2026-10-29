import { createFileRoute } from '@tanstack/react-router'
import { ViewPurchaseOrderPage } from '@/features/purchase-orders/pages/view-purchase-order-page'

export const Route = createFileRoute('/purchase/orders/$id')({
  component: ViewPurchaseOrderPage,
})
