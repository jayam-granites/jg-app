import { PanelLeft, PanelLeftOpen, Moon, Sun, Bell, LogOut, Settings, User } from 'lucide-react'
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
import { useTheme } from '@/providers/theme'
import { useSidebar } from './sidebar-provider'
import { authClient } from '@/lib/api'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export function AppHeader() {
  const { theme, toggleTheme } = useTheme()
  const { open, setOpen, setMobileOpen } = useSidebar()
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const [signOutError, setSignOutError] = useState('')
  const userName = session?.user.name ?? 'User'
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const handleSignOut = async () => {
    setSignOutError('')
    try {
      const { error } = await authClient.signOut()
      if (error) {
        setSignOutError(error.message || 'Unable to sign out. Please try again.')
        return
      }
      await navigate({ to: '/login' })
    } catch (error) {
      setSignOutError(
        error instanceof Error ? error.message : 'Unable to sign out. Please try again.',
      )
    }
  }

  return (
    <header className="relative flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {signOutError && (
        <p
          className="absolute right-4 top-full z-50 mt-2 rounded-md border border-destructive/30 bg-background px-3 py-2 text-sm text-destructive shadow-md"
          role="alert"
        >
          {signOutError}
        </p>
      )}
      {/* Sidebar collapse trigger (desktop) */}
      <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setOpen(!open)}>
        {open ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
      </Button>

      {/* Mobile menu trigger */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
        <PanelLeft className="h-5 w-5" />
      </Button>

      <div className="flex flex-1 items-center justify-end gap-2 sm:gap-0">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            3
          </span>
        </Button>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-2 h-9 gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials || 'U'}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium lg:inline">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{session?.user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              {session?.user.role === 'super_admin' && (
                <DropdownMenuItem onClick={() => void navigate({ to: '/settings' })}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
