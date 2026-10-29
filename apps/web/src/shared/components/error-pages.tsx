import { RefreshCcw, Home } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import Svg404 from '@/assets/404-illustration.svg'
import Svg500 from '@/assets/500-illustration.svg'

type ErrorPageProps = {
  status: number
  title: string
  description: string
  illustration?: string
}

function ErrorPage({ status, title, description, illustration }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      {illustration && (
        <img
          src={illustration}
          alt=""
          className="mb-6 w-72 max-w-full"
        />
      )}
      {!illustration && (
        <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
          <Home className="h-10 w-10 text-muted-foreground" />
        </div>
      )}
      <span className="mb-2 font-mono text-7xl font-bold tracking-tighter text-primary">
        {status}
      </span>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mb-8 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="flex gap-3">
        <Button asChild variant="default" className="rounded-lg shadow-sm">
          <Link to="/">
            <Home className="mr-2 h-4 w-4" /> Go to Dashboard
          </Link>
        </Button>
        {status === 500 && (
          <Button
            variant="outline"
            className="rounded-lg"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <ErrorPage
      status={404}
      title="Error"
      description="We have lost this page. The requested page is missing. Check the URL or Return Home."
      illustration={Svg404}
    />
  )
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      status={500}
      title="Something went wrong"
      description="An unexpected error occurred. Please try again or contact support if the problem persists."
      illustration={Svg500}
    />
  )
}
