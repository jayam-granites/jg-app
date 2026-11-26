import { createFileRoute } from '@tanstack/react-router'
import { SalesReportPage } from '@/features/reports/pages/sales-report-page'

export const Route = createFileRoute('/reports/sales')({
  component: SalesReportPage,
})
