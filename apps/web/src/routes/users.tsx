import { createFileRoute, redirect } from '@tanstack/react-router'
import { hasMinimumRole, isAppRole } from '@jg-app/shared'
import { authClient } from '@/lib/api'
import { UsersPage } from '@/features/users/pages/users-page'

export const Route = createFileRoute('/users')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session || !isAppRole(session.user.role) || !hasMinimumRole(session.user.role, 'admin')) {
      throw redirect({ to: '/' })
    }
  },
  component: UsersPage,
})
