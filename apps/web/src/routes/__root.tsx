import { createRootRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { defaultRouteFor, getCurrentUser, hasAnyPermission } from '@/lib/auth'
import { permissionsForPath } from '@/lib/route-permissions'

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()

    if (location.pathname === '/login') {
      if (user) throw redirect({ to: defaultRouteFor(user) })
      return
    }

    if (!user) throw redirect({ to: '/login' })

    const required = permissionsForPath(location.pathname)
    if (required && required.length > 0 && !hasAnyPermission(user, required)) {
      throw redirect({ to: '/forbidden' })
    }
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
