import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PageLayoutProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function PageLayout({ title, description, action, children, className }: PageLayoutProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0 mt-2 sm:mt-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
