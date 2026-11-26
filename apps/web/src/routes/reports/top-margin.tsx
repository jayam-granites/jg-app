import { createFileRoute } from '@tanstack/react-router'
import { TopMarginPage } from '@/features/reports/pages/top-margin-page'

export const Route = createFileRoute('/reports/top-margin')({
  component: TopMarginPage,
})
