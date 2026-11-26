import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  Receipt,
  Users,
  Wallet,
  CalendarClock,
  Tags,
  Ruler,
  Truck,
  Building2,
  X,
  HandCoins,
  ListChecks,
  Warehouse,
  CreditCard,
  QrCode,
  Search,
  Settings,
  ContactRound,
  BarChart3,
  TrendingUp,
  Trophy,
  Flame,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-provider'
import type { Permission } from '@jg-app/shared'
import { formatRoleLabel } from '@/lib/auth'
import { useAuth } from '@/providers/auth'

type NavItem = {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  permission?: Permission
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard, permission: 'reports:read' },
    ],
  },
  {
    label: 'CRM & Follow-ups',
    items: [
      { label: 'Tasks & Follow-ups', to: '/tasks', icon: CalendarClock, permission: 'enquiries:read' },
      { label: 'CRM Directory', to: '/crm', icon: ContactRound, permission: 'enquiries:read' },
      { label: 'Enquiries', to: '/enquiries', icon: ClipboardList, permission: 'enquiries:read' },
      { label: 'Trade Contacts', to: '/resources', icon: Users, permission: 'enquiries:read' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Measurements', to: '/measurements', icon: Ruler, permission: 'billing:read' },
      { label: 'Invoices', to: '/invoices', icon: Receipt, permission: 'billing:read' },
      { label: 'Customers', to: '/customers', icon: Users, permission: 'billing:read' },
      { label: 'UPI QR Codes', to: '/qr-codes', icon: QrCode, permission: 'billing:read' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { label: 'Sales Summary', to: '/reports/sales', icon: BarChart3, permission: 'reports:read' },
      { label: 'Daily Margin & Profit %', to: '/reports/daily-margin', icon: TrendingUp, permission: 'reports:read' },
      { label: 'Top 10 High-Margin Sales', to: '/reports/top-margin', icon: Trophy, permission: 'reports:read' },
      { label: 'Top 10 High-Frequency Sales', to: '/reports/top-frequency', icon: Flame, permission: 'reports:read' },
      { label: 'Sales & Profit Overview', to: '/reports/overview', icon: LayoutDashboard, permission: 'reports:read' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Package, permission: 'catalog:read' },
      { label: 'Price Search', to: '/price-search', icon: Search, permission: 'cost_control:read' },
      { label: 'Categories', to: '/categories', icon: Tags, permission: 'catalog:read' },
      { label: 'Attributes', to: '/attributes', icon: ListChecks, permission: 'catalog:read' },
      { label: 'Units', to: '/units', icon: Ruler, permission: 'catalog:read' },
      { label: 'Stock', to: '/inventory', icon: Warehouse, permission: 'cost_control:read' },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { label: 'Purchase Orders', to: '/purchase/orders', icon: ClipboardList, permission: 'cost_control:read' },
      { label: 'Purchase Receipts', to: '/purchase/receipts', icon: Receipt, permission: 'cost_control:read' },
      { label: 'Suppliers', to: '/suppliers', icon: Building2, permission: 'cost_control:read' },
      { label: 'Brokers', to: '/brokers', icon: HandCoins, permission: 'billing:read' },
      { label: 'Transport', to: '/transport', icon: Truck, permission: 'billing:read' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Expenses', to: '/expenses', icon: Wallet, permission: 'cost_control:read' },
      { label: 'Schedules', to: '/expense-schedules', icon: CalendarClock, permission: 'cost_control:read' },
      { label: 'Accounts', to: '/accounts', icon: CreditCard, permission: 'cost_control:read' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { label: 'Users', to: '/users', icon: Users, permission: 'users:manage' },
      { label: 'Profile Settings', to: '/settings', icon: Settings, permission: 'system:manage' },
    ],
  },
]

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const isActive = pathname === item.to

  if (collapsed) {
    return (
      <Link
        to={item.to}
        className={cn(
          'flex items-center justify-center rounded-lg p-2 font-medium transition-colors duration-150 ease-out',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
        title={item.label}
      >
        <item.icon className="size-5" />
      </Link>
    )
  }

  return (
    <Link
      to={item.to}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ease-out',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
    >
      <item.icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  )
}

export function AppSidebar() {
  const { open, mobileOpen, setMobileOpen } = useSidebar()
  const collapsed = !open
  const { user, hasPermission } = useAuth()

  const isVisible = (item: NavItem): boolean =>
    !item.permission || hasPermission(item.permission)

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(isVisible),
    }))
    .filter((group) => group.items.length > 0)

  const sidebarContent = (
    <div className={cn('flex h-full flex-col', collapsed && 'items-center')}>
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <span className="text-lg font-semibold">JG</span>
        ) : (
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-semibold leading-none">JG App</span>
            {user && (
              <span className="text-[11px] text-sidebar-muted-foreground">
                Signed in as {formatRoleLabel(user.role)}
              </span>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1 px-2 py-4">
        <nav className={cn('flex flex-col gap-4', collapsed && 'gap-2')}>
          {visibleNavGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className={cn('flex flex-col gap-1', collapsed && 'gap-2')}>
                {group.items.map((item) => (
                  <NavItemLink key={item.to} item={item} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (sheet/drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-overlay" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-lg font-semibold leading-none">JG App</span>
                {user && (
                  <span className="text-[11px] text-sidebar-muted-foreground">
                    Signed in as {formatRoleLabel(user.role)}
                  </span>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="size-4" data-icon="inline-start" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-3.5rem)] px-2 py-4">
              <nav className="flex flex-col gap-4">
                {visibleNavGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-muted-foreground">
                      {group.label}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <NavItemLink key={item.to} item={item} collapsed={false} />
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </ScrollArea>
          </aside>
        </div>
      )}
    </>
  )
}
