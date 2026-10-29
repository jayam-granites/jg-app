import { createFileRoute } from '@tanstack/react-router'
import { AttributesPage } from '@/features/masters/pages/attributes-page'

export const Route = createFileRoute('/attributes')({
  component: AttributesPage,
})
