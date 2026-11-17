import { createFileRoute } from '@tanstack/react-router'
import { ResourcesPage } from '@/features/resources/pages/resources-page'

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
})
