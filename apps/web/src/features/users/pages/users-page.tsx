import { useState, type FormEvent } from 'react'
import { Ban, CheckCircle2, KeyRound, MoreHorizontal, Plus, Shield, Trash2, UsersRound } from 'lucide-react'
import { hasMinimumRole, isAppRole, ROLES, type AppRole, type User, type UserDto } from '@jg-app/shared'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { authClient } from '@/lib/api'
import { formatDateTime } from '@/lib/date'
import {
  useCreateUser,
  useDeleteUser,
  useSetUserSuspended,
  useUpdateUserPassword,
  useUpdateUserRole,
  useUsers,
} from '../hooks/use-users'

const roleLabels: Record<AppRole, string> = {
  sales: 'Sales',
  manager: 'Manager',
  admin: 'Admin',
  super_admin: 'Super admin',
}

export function UsersPage() {
  const { data: response, isLoading, error: loadError } = useUsers()
  const createUser = useCreateUser()
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const setSuspended = useSetUserSuspended()
  const updatePassword = useUpdateUserPassword()
  const { data: session } = authClient.useSession()
  const callerId = session?.user.id
  const callerRole = isAppRole(session?.user.role) ? session.user.role : 'sales'
  const assignableRoles = ROLES.filter((role) => hasMinimumRole(callerRole, role))
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<AppRole>('sales')
  const [passwordUser, setPasswordUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const users = response?.data ?? []

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data: UserDto = { name: name.trim(), email: email.trim(), password, role }
    createUser.mutate(data, {
      onSuccess: () => {
        setName('')
        setEmail('')
        setPassword('')
        setRole('sales')
      },
    })
  }

  const handleDelete = (user: User) => {
    if (!window.confirm(`Remove ${user.name} and revoke their access?`)) return
    deleteUser.mutate(user.id)
  }

  const handlePasswordUpdate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!passwordUser) return
    updatePassword.mutate(
      { id: passwordUser.id, password: newPassword },
      {
        onSuccess: () => {
          setPasswordUser(null)
          setNewPassword('')
        },
      },
    )
  }

  const isMutating =
    updateRole.isPending ||
    deleteUser.isPending ||
    setSuspended.isPending ||
    updatePassword.isPending

  return (
    <PageLayout title="Users & roles" description="Create team accounts and manage their access level.">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(19rem,0.8fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Team members</CardTitle>
                <CardDescription>Manage accounts and assigned roles.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadError ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                {loadError.message}
              </p>
            ) : isLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading users…</p>
            ) : users.length === 0 ? (
              <div className="py-12 text-center">
                <UsersRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
                <p className="font-medium">No users yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Create a team account to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden md:table-cell">Added</TableHead>
                      <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isSelf = user.id === callerId
                      const isSuperAdmin = user.role === 'super_admin'
                      const canManageTarget = callerRole === 'super_admin' || !isSuperAdmin

                      return (
                        <TableRow key={user.id}>
                          <TableCell className="min-w-48">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{user.name}{isSelf ? ' (you)' : ''}</p>
                              {user.isSuspended && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                  Suspended
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </TableCell>
                          <TableCell>
                            {canManageTarget && !isSelf ? (
                              <select
                                aria-label={`Role for ${user.name}`}
                                className="h-9 min-w-32 rounded-md border border-input bg-background px-2 text-sm"
                                value={user.role}
                                disabled={isMutating}
                                onChange={(event) => {
                                  const nextRole = event.target.value as AppRole
                                  updateRole.mutate({ id: user.id, role: nextRole })
                                }}
                              >
                                {assignableRoles.map((option) => (
                                  <option key={option} value={option}>{roleLabels[option]}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                                {roleLabels[user.role]}
                                {isSuperAdmin && <Shield className="h-3.5 w-3.5 text-primary" />}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground md:table-cell">
                            {formatDateTime(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isSelf && canManageTarget && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Actions for ${user.name}`}
                                    disabled={isMutating}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem
                                    onSelect={() => {
                                      setPasswordUser(user)
                                      setNewPassword('')
                                      updatePassword.reset()
                                    }}
                                  >
                                    <KeyRound className="h-4 w-4" />
                                    Update password
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      setSuspended.mutate({
                                        id: user.id,
                                        isSuspended: !user.isSuspended,
                                      })
                                    }
                                  >
                                    {user.isSuspended ? (
                                      <CheckCircle2 className="h-4 w-4" />
                                    ) : (
                                      <Ban className="h-4 w-4" />
                                    )}
                                    {user.isSuspended ? 'Reactivate' : 'Suspend'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onSelect={() => handleDelete(user)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            {(updateRole.error || deleteUser.error || setSuspended.error) && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {updateRole.error?.message ?? deleteUser.error?.message ?? setSuspended.error?.message}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Create user</CardTitle>
                  <CardDescription>Set an initial password and role.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleCreate}>
                <div className="space-y-2">
                  <label htmlFor="user-name" className="text-sm font-medium">Name</label>
                  <Input
                    id="user-name"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    disabled={createUser.isPending}
                    placeholder="Team member name"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-email" className="text-sm font-medium">Email</label>
                  <Input
                    id="user-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={createUser.isPending}
                    placeholder="name@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-password" className="text-sm font-medium">Temporary password</label>
                  <Input
                    id="user-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    disabled={createUser.isPending}
                    placeholder="At least 8 characters"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="user-role" className="text-sm font-medium">Role</label>
                  <select
                    id="user-role"
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={role}
                    onChange={(event) => setRole(event.target.value as AppRole)}
                    disabled={createUser.isPending}
                  >
                    {assignableRoles.map((option) => (
                      <option key={option} value={option}>{roleLabels[option]}</option>
                    ))}
                  </select>
                </div>
                {createUser.error && (
                  <p className="text-sm text-destructive" role="alert">{createUser.error.message}</p>
                )}
                <Button type="submit" className="w-full" disabled={createUser.isPending}>
                  <KeyRound className="h-4 w-4" />
                  {createUser.isPending ? 'Creating account…' : 'Create account'}
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  The user can sign in with these credentials. Share the temporary password securely.
                </p>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role levels</CardTitle>
              <CardDescription>Higher roles inherit authority from lower roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ROLES.map((item) => (
                <div key={item} className="flex items-center justify-between gap-3 text-sm">
                  <span>{roleLabels[item]}</span>
                  <span className="text-xs text-muted-foreground">
                    {item === 'sales' ? 'Base access' : item === 'super_admin' ? 'Full access' : 'Elevated access'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={passwordUser !== null}
        onOpenChange={(open) => {
          if (!open && !updatePassword.isPending) {
            setPasswordUser(null)
            setNewPassword('')
            updatePassword.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update password</DialogTitle>
            <DialogDescription>
              Set a new password for {passwordUser?.name}. Their current sessions will be signed out.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePasswordUpdate}>
            <div className="space-y-2">
              <label htmlFor="replacement-password" className="text-sm font-medium">New password</label>
              <Input
                id="replacement-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                disabled={updatePassword.isPending}
              />
            </div>
            {updatePassword.error && (
              <p className="text-sm text-destructive" role="alert">{updatePassword.error.message}</p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={updatePassword.isPending}
                onClick={() => setPasswordUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updatePassword.isPending}>
                {updatePassword.isPending ? 'Updating…' : 'Update password'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
