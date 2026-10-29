import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/accounts')({
  component: AccountsLayout,
})

function AccountsLayout() {
  return <Outlet />
}
