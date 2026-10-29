import { createFileRoute } from '@tanstack/react-router'
import { UnitsPage } from '@/features/masters/pages/units-page'

export const Route = createFileRoute('/units')({
  component: UnitsPage,
})
