import { createFileRoute } from '@tanstack/react-router'
import { CreateInvoicePage } from '@/features/invoices/pages/create-invoice-page'

export const Route = createFileRoute('/invoices/create')({
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: search.customerId ? Number(search.customerId) : undefined,
    measurementId: search.measurementId ? Number(search.measurementId) : undefined,
  }),
  component: CreateInvoicePage,
})
