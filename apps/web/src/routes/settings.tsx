import { createFileRoute, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/api'
import { SettingsPage } from '@/features/settings/pages/settings-page'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    if (!session || session.user.role !== 'super_admin') {
      throw redirect({ to: '/' })
    }
  },
  component: SettingsPage,
})
