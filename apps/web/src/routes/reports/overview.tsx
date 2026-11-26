import { createFileRoute } from '@tanstack/react-router'
import { OverviewPage } from '@/features/reports/pages/overview-page'

export const Route = createFileRoute('/reports/overview')({
  component: OverviewPage,
})
