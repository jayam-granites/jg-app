import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { authClient } from '@/lib/api'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const { data: session } = await authClient.getSession()

    if (location.pathname === '/login') {
      if (session) throw redirect({ to: '/' })
      return
    }

    if (!session) throw redirect({ to: '/login' })
  },
  component: () => {
    const isLoginPage = useRouterState({
      select: (state) => state.location.pathname === '/login',
    })

    if (isLoginPage) return <Outlet />

    return (
      <DashboardLayout>
        <Outlet />
        <TanStackRouterDevtools />
      </DashboardLayout>
    )
  },
})
