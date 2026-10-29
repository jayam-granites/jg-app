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
  ChevronDown,
  X,
  HandCoins,
  ListChecks,
  Warehouse,
  CreditCard,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useSidebar } from './sidebar-provider'
import { useState } from 'react'

type NavItem = {
  label: string
  to?: string
  icon: React.ComponentType<{ className?: string }>
  children?: NavItem[]
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products', to: '/products', icon: Package },
      { label: 'Price Search', to: '/price-search', icon: Search },
      { label: 'Categories', to: '/categories', icon: Tags },
      { label: 'Attributes', to: '/attributes', icon: ListChecks },
      { label: 'Units', to: '/units', icon: Ruler },
      { label: 'Stock', to: '/inventory', icon: Warehouse },
    ],
  },
  {
    label: 'Purchase',
    items: [
      { label: 'Purchase Orders', to: '/purchase/orders', icon: ClipboardList },
      { label: 'Purchase Receipts', to: '/purchase/receipts', icon: Receipt },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Invoices', to: '/invoices', icon: Receipt },
      { label: 'Customers', to: '/customers', icon: Users },
      { label: 'Measurements', to: '/measurements', icon: Ruler },
    ],
  },
  {
    label: 'Expenses',
    items: [
      { label: 'Expenses', to: '/expenses', icon: Wallet },
      { label: 'Schedules', to: '/expense-schedules', icon: CalendarClock },
      { label: 'Accounts', to: '/accounts', icon: CreditCard },
    ],
  },
  {
    label: 'Masters',
    items: [
      { label: 'Suppliers', to: '/suppliers', icon: Building2 },
      { label: 'Brokers', to: '/brokers', icon: HandCoins },
      { label: 'Transport', to: '/transport', icon: Truck },
    ],
  },
]

function NavItemLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const isActive = item.to ? pathname === item.to : false

  if (collapsed) {
    return (
      <Link
        to={item.to!}
        className={cn(
          'flex items-center justify-center rounded-lg p-2 transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )}
        title={item.label}
      >
        <item.icon className="h-5 w-5" />
      </Link>
    )
  }

  return (
    <Link
      to={item.to!}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

function NavGroupCollapsible({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const { pathname } = useLocation()
  const isParentActive = item.children?.some((c) => c.to && pathname === c.to)
  const [open, setOpen] = useState(isParentActive ?? false)

  if (collapsed) {
    return (
      <div className="space-y-1">
        {item.children?.map((child) => (
          <NavItemLink key={child.to} item={child} collapsed={true} />
        ))}
      </div>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isParentActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown
          className={cn('h-4 w-4 transition-transform', open && 'rotate-180')}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 pt-1">
        {item.children?.map((child) => (
          <Link
            key={child.to}
            to={child.to!}
            className={cn(
              'flex items-center gap-3 rounded-lg py-2 pl-9 pr-3 text-sm transition-colors',
              pathname === child.to
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
            )}
          >
            <child.icon className="h-4 w-4 shrink-0" />
            {child.label}
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

export function AppSidebar() {
  const { open, mobileOpen, setMobileOpen } = useSidebar()
  const collapsed = !open

  const sidebarContent = (
    <div className={cn('flex h-full flex-col', collapsed && 'items-center')}>
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-4', collapsed && 'justify-center px-2')}>
        {collapsed ? (
          <span className="text-lg font-bold">JG</span>
        ) : (
          <span className="text-lg font-semibold">JG App</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 py-4">
        <nav className={cn('space-y-4', collapsed && 'space-y-2')}>
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                    <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
              )}
              <div className={cn('space-y-1', collapsed && 'space-y-2')}>
                {group.items.map((item) =>
                  item.children ? (
                    <NavGroupCollapsible key={item.label} item={item} collapsed={collapsed} />
                  ) : item.to ? (
                    <NavItemLink key={item.to} item={item} collapsed={collapsed} />
                  ) : null,
                )}
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
          'hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:block',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar (sheet/drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-lg font-semibold">JG App</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-3.5rem)] px-2 py-4">
              <nav className="space-y-4">
                {navGroups.map((group) => (
                  <div key={group.label}>
                <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) =>
                        item.children ? (
                          <NavGroupCollapsible key={item.label} item={item} collapsed={false} />
                        ) : item.to ? (
                          <NavItemLink key={item.to} item={item} collapsed={false} />
                        ) : null,
                      )}
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
