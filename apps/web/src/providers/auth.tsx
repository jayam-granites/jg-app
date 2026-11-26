import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Permission } from '@jg-app/shared'
import {
  hasAnyPermission as checkAnyPermission,
  hasPermission as checkPermission,
  getCurrentUser,
  type CurrentUser,
} from '@/lib/auth'

type AuthContextValue = {
  user: CurrentUser | null
  isLoading: boolean
  refresh: () => Promise<CurrentUser | null>
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: readonly Permission[]) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refresh = useCallback(async () => {
    const nextUser = await getCurrentUser()
    setUser(nextUser)
    setIsLoading(false)
    if (!nextUser) queryClient.clear()
    return nextUser
  }, [queryClient])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      refresh,
      hasPermission: (permission) => checkPermission(user, permission),
      hasAnyPermission: (permissions) => checkAnyPermission(user, permissions),
    }),
    [user, isLoading, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
