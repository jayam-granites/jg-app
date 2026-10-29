import { createFileRoute } from '@tanstack/react-router'
import { BrokersPage } from '@/features/brokers/pages/brokers-page'

export const Route = createFileRoute('/brokers')({
  component: BrokersPage,
})
