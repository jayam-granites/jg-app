import { createFileRoute } from '@tanstack/react-router'
import { CreateCustomerPage } from '@/features/customers/pages/create-customer-page'

export const Route = createFileRoute('/customers/create')({
  component: CreateCustomerPage,
})
