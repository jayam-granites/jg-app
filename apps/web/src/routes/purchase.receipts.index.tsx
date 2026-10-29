import { createFileRoute } from '@tanstack/react-router'
import { PurchaseReceiptsListPage } from '@/features/purchase-receipts/pages/purchase-receipts-list-page'

export const Route = createFileRoute('/purchase/receipts/')({
  component: PurchaseReceiptsListPage,
})
