import { PanelLeft, PanelLeftOpen, Moon, Sun, Bell, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/providers/theme'
import { useAuth } from '@/providers/auth'
import { useSidebar } from './sidebar-provider'
import { authClient } from '@/lib/api'
import { formatRoleLabel } from '@/lib/auth'
import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTasks, type TaskRecord } from '@/features/tasks/hooks/use-tasks'
import { formatDate } from '@/lib/date'

function followUpContact(task: TaskRecord): string {
  return (
    task.enquiry?.customerName ||
    task.resource?.name ||
    task.customer?.name ||
    task.supplier?.name ||
    task.broker?.name ||
    task.transport?.name ||
    'Unassigned'
  )
}

export function AppHeader() {
  const { theme, toggleTheme } = useTheme()
  const { open, setOpen, setMobileOpen } = useSidebar()
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const userName = user?.name ?? 'User'
  const roleLabel = user ? formatRoleLabel(user.role) : ''
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const { data: tasksResponse } = useTasks()
  const tomorrowStart = new Date()
  tomorrowStart.setHours(0, 0, 0, 0)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)
  const tomorrowKey = tomorrowStart.getTime()

  const dueFollowUps = useMemo(() => {
    const openStatuses = new Set(['PENDING', 'IN_PROGRESS'])
    return (tasksResponse?.data ?? [])
      .filter(
        (task) =>
          openStatuses.has(task.status) && new Date(task.dueDate).getTime() < tomorrowKey,
      )
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
  }, [tasksResponse?.data, tomorrowKey])

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      const { error } = await authClient.signOut()
      if (error) {
        setSignOutError(error.message || 'Unable to sign out. Please try again.')
        return
      }
      await refresh()
      await navigate({ to: '/login' })
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
      )
    }
  }

  return (
    <header className="relative flex h-14 items-center gap-4 border-b border-border/70 bg-background px-4 lg:px-6">
      {signOutError && (
        <p
          className="absolute right-4 top-full z-50 mt-2 rounded-lg border border-destructive/30 bg-popover px-3 py-2 text-sm text-destructive shadow-lg"
          role="alert"
        >
          {signOutError}
        </p>
      )}
      {/* Sidebar collapse trigger (desktop) */}
      <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setOpen(!open)}>
        {open ? <PanelLeftOpen className="size-4" /> : <PanelLeft className="size-4" />}
      </Button>

      {/* Mobile menu trigger */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
        <PanelLeft className="size-4" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-0">
        {/* Follow-up notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              aria-label={`Follow-up notifications (${dueFollowUps.length})`}
            >
              <Bell className="size-4" />
              {dueFollowUps.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-4 text-destructive-foreground">
                  {dueFollowUps.length > 9 ? '9+' : dueFollowUps.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>Follow-ups</span>
              <span className="text-xs font-normal text-muted-foreground">
                {dueFollowUps.length} due
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {dueFollowUps.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No follow-ups due.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto p-1">
                {dueFollowUps.slice(0, 8).map((task) => (
                  <DropdownMenuItem
                    key={task.id}
                    className="flex flex-col items-start gap-1 py-2"
                    onSelect={() => void navigate({ to: '/tasks' })}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="truncate font-medium">{task.title}</span>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {task.priority}
                      </Badge>
                    </span>
                    <span className="flex w-full items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{followUpContact(task)}</span>
                      <span className="shrink-0">{formatDate(task.dueDate)}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center font-medium"
              onSelect={() => void navigate({ to: '/tasks' })}
            >
              View all follow-ups
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 h-9 gap-2 px-2">
              <Avatar className="size-7">
                <AvatarFallback>{initials || 'U'}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:inline">{userName}</span>
              {user && (
                <span className="inline-flex items-center rounded-full border border-border/80 bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium leading-none text-foreground">
                  {roleLabel}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  {user && <Badge variant="outline">{roleLabel}</Badge>}
                </div>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => void navigate({ to: '/profile' })}>
                <User className="mr-2 size-4" />
                Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
