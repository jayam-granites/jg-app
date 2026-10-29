import { createFileRoute } from '@tanstack/react-router'
import { CategoriesPage } from '@/features/masters/pages/categories-page'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})
