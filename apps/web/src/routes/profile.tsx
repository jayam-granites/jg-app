import { useEffect, useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { LockKeyhole, Save } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/api'
import { formatRoleLabel } from '@/lib/auth'
import { useAuth } from '@/providers/auth'
import { PageLayout } from '@/shared/components/page-layout'

export const Route = createFileRoute('/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { user, isLoading, refresh } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) setName(user.name)
  }, [user?.id, user?.name])

  if (isLoading || !user) {
    return (
      <PageLayout title="My profile" description="View your account details and update your display name.">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="size-12 rounded-full" />
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-9 w-full max-w-sm" />
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  const trimmedName = name.trim()
  const isUnchanged = trimmedName === user.name

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!trimmedName || isUnchanged) return

    setIsSaving(true)
    try {
      const result = await authClient.updateUser({ name: trimmedName })
      if (result.error) {
        setError(result.error.message || 'Unable to update your name. Please try again.')
        return
      }
      await refresh()
      setMessage('Your display name has been updated.')
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update your name. Please try again.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PageLayout title="My profile" description="View your account details and update your display name.">
      <div className="mx-auto w-full max-w-3xl">
        <Card className="shadow-xs">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="size-12">
                <AvatarFallback>{initials || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <CardTitle>{user.name}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <span>{user.email}</span>
                  <Badge variant="secondary">{formatRoleLabel(user.role)}</Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <form className="flex flex-col gap-5" onSubmit={(event) => void handleSubmit(event)}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label htmlFor="profile-name">Display name</Label>
                  <Input
                    id="profile-name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setError('')
                      setMessage('')
                    }}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This is the only profile field you can change.
                  </p>
                </div>
                <div>
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={user.email}
                    readOnly
                    disabled
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed here.</p>
                </div>
                <div>
                  <Label htmlFor="profile-role">Role</Label>
                  <Input
                    id="profile-role"
                    value={formatRoleLabel(user.role)}
                    readOnly
                    disabled
                    className="bg-muted/40 text-muted-foreground"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Roles are managed by an administrator.</p>
                </div>
              </div>

              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}

              <div>
                <Button type="submit" disabled={isSaving || !trimmedName || isUnchanged}>
                  <Save data-icon="inline-start" />
                  {isSaving ? 'Saving…' : 'Save name'}
                </Button>
              </div>
            </form>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
              <LockKeyhole className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">Password and account access</p>
                <p className="text-sm text-muted-foreground">
                  Password updates and other account edits are not available from this screen.
                  Contact an administrator if you need assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
