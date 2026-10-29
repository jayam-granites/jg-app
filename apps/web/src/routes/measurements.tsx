import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/measurements')({
  component: () => <Outlet />,
})
