import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'secondary'
type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  startIcon?: ReactNode
  block?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-[var(--mors-color-accent)] text-[var(--mors-color-text-on-accent)] hover:bg-[var(--mors-color-accent-hover)]',
  ghost:
    'bg-transparent text-[var(--mors-color-text-secondary)] hover:bg-[var(--mors-color-surface-hover)] hover:text-[var(--mors-color-text)]',
  outline:
    'border border-[var(--mors-color-border)] bg-[var(--mors-color-surface)] text-[var(--mors-color-text)] hover:bg-[var(--mors-color-surface-hover)]',
  secondary:
    'bg-[var(--mors-color-surface-active)] text-[var(--mors-color-text)] hover:bg-[var(--mors-color-surface-hover)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-[var(--mors-control-height-sm)] px-[var(--mors-control-padding-sm)] text-[var(--mors-text-xs)]',
  md: 'h-[var(--mors-control-height-md)] px-[var(--mors-control-padding-md)] text-[var(--mors-text-sm)]',
}

export function Button({
  variant = 'default',
  size = 'md',
  startIcon,
  block = false,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-[var(--mors-space-2)] rounded-[var(--mors-radius-sm)] font-medium transition-colors duration-[var(--mors-duration-fast)] focus-visible:outline-none focus-visible:ring-[var(--mors-focus-width)] focus-visible:ring-[var(--mors-focus-color)] disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        sizeClasses[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {startIcon}
      {children}
    </button>
  )
}

export interface IconButtonProps extends Omit<ButtonProps, 'startIcon' | 'block'> {
  label: string
  icon: ReactNode
}

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <Button
      type="button"
      aria-label={label}
      title={label}
      className={cn('size-[var(--mors-control-height-sm)] px-0', className)}
      {...props}
    >
      {icon}
    </Button>
  )
}
