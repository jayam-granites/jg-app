import { createFileRoute } from '@tanstack/react-router'
import { DailyMarginPage } from '@/features/reports/pages/daily-margin-page'

export const Route = createFileRoute('/reports/daily-margin')({
  component: DailyMarginPage,
})
