import { createFileRoute } from '@tanstack/react-router'
import { EnquiriesPage } from '@/features/enquiries/pages/enquiries-page'

export const Route = createFileRoute('/enquiries')({
  component: EnquiriesPage,
})
