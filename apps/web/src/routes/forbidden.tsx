import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, LogOut, ShieldAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/api'
import { defaultRouteFor, formatRoleLabel } from '@/lib/auth'
import { useAuth } from '@/providers/auth'
import { PageLayout } from '@/shared/components/page-layout'

export const Route = createFileRoute('/forbidden')({
  component: AccessDeniedPage,
})

function AccessDeniedPage() {
  const navigate = useNavigate()
  const { user, refresh, hasPermission } = useAuth()

  const landingRoute = (): ReturnType<typeof defaultRouteFor> => {
    if (hasPermission('reports:read')) return '/'
    if (hasPermission('billing:read')) return '/invoices'
    if (hasPermission('enquiries:read')) return '/enquiries'
    return '/tasks'
  }

  const handleSignOut = async () => {
    await authClient.signOut()
    await refresh()
    await navigate({ to: '/login' })
  }

  return (
    <PageLayout
      title="Access restricted"
      description="Your role does not include access to this area."
    >
      <div className="mx-auto w-full max-w-2xl">
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <ShieldAlert className="size-5" />
              </div>
              <div className="flex flex-col gap-1">
                <CardTitle>Access Restricted</CardTitle>
                <CardDescription>403 — Forbidden</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="font-mono">403</Badge>
          </CardHeader>
          <CardContent className="space-y-5">
            <Alert variant="destructive">
              <AlertTitle>You do not have permission to view this page.</AlertTitle>
              <AlertDescription>
                Ask an administrator if you need access, or continue to an area available to your role.
              </AlertDescription>
            </Alert>

            {user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Current role</span>
                <Badge variant="secondary">{formatRoleLabel(user.role)}</Badge>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void navigate({ to: landingRoute() })}>
                <ArrowLeft className="mr-2 size-4" />
                Go to my workspace
              </Button>
              <Button variant="outline" onClick={() => void handleSignOut()}>
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
