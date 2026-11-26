import { createFileRoute } from '@tanstack/react-router'
import { TopFrequencyPage } from '@/features/reports/pages/top-frequency-page'

export const Route = createFileRoute('/reports/top-frequency')({
  component: TopFrequencyPage,
})
