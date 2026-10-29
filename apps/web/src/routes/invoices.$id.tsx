import { createFileRoute } from '@tanstack/react-router'
import { ViewInvoicePage } from '@/features/invoices/pages/view-invoice-page'

export const Route = createFileRoute('/invoices/$id')({
  component: ViewInvoicePage,
})
