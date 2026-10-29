import { type ReactNode } from 'react'
import { SidebarProvider } from './sidebar-provider'
import { AppSidebar } from './app-sidebar'
import { AppHeader } from './app-header'

type DashboardLayoutProps = {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="shrink-0 print:hidden"><AppSidebar /></div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="print:hidden"><AppHeader /></div>
          <main className="min-w-0 flex-1 p-4 sm:p-5 lg:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
