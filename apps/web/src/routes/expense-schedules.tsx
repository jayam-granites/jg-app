import { createFileRoute } from '@tanstack/react-router'
import { ExpenseSchedulesPage } from '@/features/expense-schedules/pages/expense-schedules-page'

export const Route = createFileRoute('/expense-schedules')({
  component: ExpenseSchedulesPage,
})
