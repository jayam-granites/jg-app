import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '@/features/tasks/pages/tasks-page'

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
})
