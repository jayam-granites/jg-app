import type { ReactNode } from 'react'
import { AlertTriangle, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export function ReportTable({
  title,
  description,
  action,
  headers,
  children,
  className,
  contentClassName,
}: {
  title?: string
  description?: string
  action?: ReactNode
  headers: ReactNode[]
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b py-4">
          <div className="flex flex-col gap-1">
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </CardHeader>
      )}
      <CardContent className={cn('p-0', contentClassName)}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="sticky top-0 bg-muted">
                {headers.map((header, index) => (
                  <TableHead key={index} className={cn(index > 0 && 'text-right')}>{header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{children}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReportEmptyRow({ colSpan, message = 'No records found for this period' }: { colSpan: number; message?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <Inbox className="size-8 text-muted-foreground/50" />
          <p className="text-sm">{message}</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

/** Shared loading / error / empty wrapper used by every report page. */
export function ReportStateCard({
  isLoading,
  isError,
  isEmpty,
  onRetry,
  children,
  skeleton,
  errorTitle = 'Could not load report',
  emptyTitle = 'No data for this period',
  emptyDescription = 'Try widening the date range or changing the status filter.',
}: {
  isLoading: boolean
  isError: boolean
  isEmpty: boolean
  onRetry: () => void
  children: ReactNode
  skeleton?: ReactNode
  errorTitle?: string
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          {skeleton ?? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-72 w-full rounded-lg" />
              <Skeleton className="h-48 w-full rounded-lg" />
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <AlertTriangle className="size-8 text-warning" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">{errorTitle}</p>
            <p className="text-sm text-muted-foreground">Check the API connection and try again.</p>
          </div>
          <Button variant="outline" onClick={onRetry}>Retry</Button>
        </CardContent>
      </Card>
    )
  }

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
          <Inbox className="size-9 text-muted-foreground/50" />
          <p className="font-medium text-foreground">{emptyTitle}</p>
          <p className="max-w-sm text-sm">{emptyDescription}</p>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
