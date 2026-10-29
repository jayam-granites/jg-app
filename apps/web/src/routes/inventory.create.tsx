import { createFileRoute } from '@tanstack/react-router'
import { CreateInventoryPage } from '@/features/inventory/pages/create-inventory-page'

export const Route = createFileRoute('/inventory/create')({
  component: CreateInventoryPage,
})
