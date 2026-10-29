import { createFileRoute } from '@tanstack/react-router'
import { CustomersPage } from '@/features/customers/pages/customers-page'

export const Route = createFileRoute('/customers/')({
  component: CustomersPage,
})
