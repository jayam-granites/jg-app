import { useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowRight, Eye, EyeOff, Gem, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/api'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const router = useRouter()
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

      await router.invalidate()
      await navigate({ to: '/' })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to reach the server. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-muted/40 px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-slate-950 p-10 text-white lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-300">
              <Gem className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold tracking-wide">JAYAM GRANITES</p>
              <p className="text-xs text-white/55">Business management</p>
            </div>
          </div>

          <div className="max-w-md py-12">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-amber-300">
              Welcome back
            </p>
            <h1 className="text-4xl font-semibold leading-tight">
              Your business, all in one place.
            </h1>
            <p className="mt-5 text-base leading-7 text-white/65">
              Sign in to manage products, inventory, sales, and day-to-day operations.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/55">
            <ShieldCheck className="h-4 w-4 text-amber-300" />
            Secure access for your team
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardHeader className="px-0 pt-0">
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary lg:hidden">
                <Gem className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl">Sign in to your account</CardTitle>
              <CardDescription>
                Enter your work email and password to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
                <div className="space-y-2">
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

                <div className="space-y-2">
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
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((visible) => !visible)}
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                  {!isSubmitting && <ArrowRight className="h-4 w-4" />}
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
