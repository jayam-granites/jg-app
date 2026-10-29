import { createFileRoute } from '@tanstack/react-router'
import { TransportPage } from '@/features/transport/pages/transport-page'

export const Route = createFileRoute('/transport')({
  component: TransportPage,
})
