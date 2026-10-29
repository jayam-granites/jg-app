import { createFileRoute } from '@tanstack/react-router'
import { CreatePurchaseReceiptPage } from '@/features/purchase-receipts/pages/create-purchase-receipt-page'

export const Route = createFileRoute('/purchase/receipts/create')({
  component: CreatePurchaseReceiptPage,
})
