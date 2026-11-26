import { useId, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string
  size?: 'sm' | 'md'
}

export function TextField({ label, size = 'md', className, id, ...props }: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="flex min-w-0 flex-col gap-[var(--mors-space-2)]">
      <label
        htmlFor={inputId}
        className="text-[var(--mors-text-2xs)] font-medium uppercase tracking-[var(--mors-tracking-caps)] text-[var(--mors-color-text-tertiary)]"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'w-full rounded-[var(--mors-radius-sm)] border border-[var(--mors-color-border)] bg-[var(--mors-color-surface)] text-[var(--mors-color-text)] placeholder:text-[var(--mors-color-text-tertiary)] focus-visible:outline-none focus-visible:ring-[var(--mors-focus-width)] focus-visible:ring-[var(--mors-focus-color)]',
          size === 'sm'
            ? 'h-[var(--mors-control-height-sm)] px-[var(--mors-control-padding-sm)] text-[var(--mors-text-xs)]'
            : 'h-[var(--mors-control-height-md)] px-[var(--mors-control-padding-md)] text-[var(--mors-text-sm)]',
          className,
        )}
        {...props}
      />
    </div>
  )
}
