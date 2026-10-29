import { createFileRoute } from '@tanstack/react-router'
import { InvoicesListPage } from '@/features/invoices/pages/invoices-list-page'

export const Route = createFileRoute('/invoices/')({
  component: InvoicesListPage,
})
