import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'

function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-ring/30',
        variant === 'default' && 'border-transparent bg-primary text-primary-foreground',
        variant === 'secondary' && 'border-transparent bg-secondary text-secondary-foreground',
        variant === 'destructive' && 'border-transparent bg-destructive text-destructive-foreground',
        variant === 'success' && 'border-transparent bg-success/12 text-success-foreground',
        variant === 'warning' && 'border-transparent bg-warning/15 text-warning-foreground',
        variant === 'info' && 'border-transparent bg-info/12 text-info-foreground',
        variant === 'outline' && 'border-border/80 text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
