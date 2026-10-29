import { createFileRoute } from '@tanstack/react-router'
import { InventoryBatchPage } from '@/features/inventory/pages/inventory-batch-page'

export const Route = createFileRoute('/inventory/$id')({
  component: InventoryBatchPage,
})
