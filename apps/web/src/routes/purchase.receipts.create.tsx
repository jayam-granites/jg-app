import { createFileRoute } from '@tanstack/react-router'
import { CreatePurchaseReceiptPage } from '@/features/purchase-receipts/pages/create-purchase-receipt-page'

export const Route = createFileRoute('/purchase/receipts/create')({
  validateSearch: (search: Record<string, unknown>) => ({
    purchaseOrderId: typeof search.purchaseOrderId === 'string' ? search.purchaseOrderId : undefined,
  }),
  component: CreatePurchaseReceiptPage,
})
