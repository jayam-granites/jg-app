import { type ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { SidebarProvider } from './sidebar-provider'
import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'

type DashboardLayoutProps = {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = useLocation({ select: (state) => state.pathname })

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background print:h-auto print:overflow-visible">
        <div className="h-dvh shrink-0 print:hidden"><AppSidebar /></div>
        <div className="flex h-dvh min-w-0 flex-1 flex-col">
          <div className="shrink-0 print:hidden"><AppHeader /></div>
          <main
            key={pathname}
            className="route-enter min-h-0 min-w-0 flex-1 overflow-y-auto p-6 print:overflow-visible"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
