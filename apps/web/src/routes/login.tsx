import { useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, Gem, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/api'
import { defaultRouteFor } from '@/lib/auth'
import { useAuth } from '@/providers/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const { error } = await authClient.signIn.email({ email, password })
      if (error) {
        setErrorMessage(error.message || 'Unable to sign in. Check your credentials and try again.')
        return
      }

      const user = await refresh()
      await router.invalidate()
      await navigate({ to: defaultRouteFor(user) })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to reach the server. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/30 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 size-[28rem] rounded-full bg-warning/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-xl border border-border/70 bg-card shadow-xs lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-foreground p-10 text-background lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-background/10 text-warning">
              <Gem className="size-5" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-semibold tracking-wide">JAYAM GRANITES</p>
              <p className="text-xs text-background/60">Business management</p>
            </div>
          </div>

          <div className="max-w-md py-12">
            <p className="mb-4 text-xs font-medium uppercase tracking-widest text-warning">
              Welcome back
            </p>
            <h1 className="text-2xl font-semibold tracking-tight leading-tight tracking-tight">
              Your business, all in one place.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-background/70">
              Sign in to manage products, inventory, sales, and day-to-day operations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-background/60">
            <ShieldCheck className="size-4 text-warning" />
            Secure access for your team
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="mb-5 flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary lg:hidden">
                <Gem className="size-5" />
              </div>
              <CardTitle className="text-2xl font-semibold tracking-tight">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your work email and password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="email">
                    Email address
                  </label>
                  <Input
                    autoComplete="username"
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      autoComplete="current-password"
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="pr-11"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((visible) => !visible)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
                    {errorMessage}
                  </p>
                )}

                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                  {!isSubmitting && <ArrowRight className="size-4" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-xs text-muted-foreground">
                Need access? Contact your system administrator.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
