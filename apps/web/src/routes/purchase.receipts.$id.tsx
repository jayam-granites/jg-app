import { createFileRoute } from '@tanstack/react-router'
import { ViewPurchaseReceiptPage } from '@/features/purchase-receipts/pages/view-purchase-receipt-page'

export const Route = createFileRoute('/purchase/receipts/$id')({
  component: ViewPurchaseReceiptPage,
})
