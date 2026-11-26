import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: 'flat' | 'raised'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses = {
  none: '',
  sm: 'p-[var(--mors-space-4)]',
  md: 'p-[var(--mors-space-5)]',
  lg: 'p-[var(--mors-space-6)]',
} as const

export function Card({ elevation = 'flat', padding = 'md', className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--mors-radius-md)] border border-[var(--mors-color-border)] bg-[var(--mors-color-surface)] text-[var(--mors-color-text)]',
        elevation === 'raised' && 'shadow-[var(--mors-shadow-sm)]',
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  )
}
