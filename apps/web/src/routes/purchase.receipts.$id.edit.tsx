import { createFileRoute } from '@tanstack/react-router'
import { EditPurchaseReceiptPage } from '@/features/purchase-receipts/pages/edit-purchase-receipt-page'

export const Route = createFileRoute('/purchase/receipts/$id/edit')({
  component: EditPurchaseReceiptPage,
})
