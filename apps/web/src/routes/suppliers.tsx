import { createFileRoute } from '@tanstack/react-router'
import { SuppliersPage } from '@/features/suppliers/pages/suppliers-page'

export const Route = createFileRoute('/suppliers')({
  component: SuppliersPage,
})
