import { createFileRoute } from '@tanstack/react-router'
import { ExpensesPage } from '@/features/expenses/pages/expenses-page'

export const Route = createFileRoute('/expenses')({
  component: ExpensesPage,
})
