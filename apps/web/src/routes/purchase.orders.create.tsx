import { createFileRoute } from '@tanstack/react-router'
import { CreatePurchaseOrderPage } from '@/features/purchase-orders/pages/create-purchase-order-page'

export const Route = createFileRoute('/purchase/orders/create')({
  component: CreatePurchaseOrderPage,
})
