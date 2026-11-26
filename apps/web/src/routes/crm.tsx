import { createFileRoute } from '@tanstack/react-router'
import { CrmPage } from '@/features/crm/pages/crm-page'

export const Route = createFileRoute('/crm')({
  component: CrmPage,
})
