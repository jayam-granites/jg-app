import { cn } from '@/lib/utils'
import type { Tone } from './types'

export const TONES: Tone[] = ['accent', 'success', 'warning', 'danger', 'info', 'neutral']

const toneColors: Record<Tone, string> = {
  accent: 'var(--mors-color-accent)',
  success: 'var(--mors-color-success)',
  warning: 'var(--mors-color-warning)',
  danger: 'var(--mors-color-danger)',
  info: 'var(--mors-color-info)',
  neutral: 'var(--mors-neutral-500)',
}

const toneLabels: Record<Tone, string> = {
  accent: 'Accent',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
  info: 'Info',
  neutral: 'Neutral',
}

export function Swatch({ tone, size = 'sm' }: { tone: Tone; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 rounded-[var(--mors-radius-circle)]',
        size === 'sm' ? 'size-2.5' : 'size-3.5',
      )}
      style={{ backgroundColor: toneColors[tone] }}
    />
  )
}

export function SwatchGroup({
  label,
  value,
  onChange,
  size = 'sm',
  block = true,
}: {
  label: string
  value: Tone
  onChange: (tone: Tone) => void
  size?: 'sm' | 'md'
  block?: boolean
}) {
  return (
    <fieldset className={cn('min-w-0', block && 'w-full')}>
      <legend className="mb-[var(--mors-space-2)] block text-[var(--mors-text-2xs)] font-medium uppercase tracking-[var(--mors-tracking-caps)] text-[var(--mors-color-text-tertiary)]">
        {label}
      </legend>
      <div className={cn('flex flex-wrap items-center gap-[var(--mors-space-2)]')}>
        {TONES.map((tone) => (
          <button
            key={tone}
            type="button"
            aria-label={toneLabels[tone]}
            aria-pressed={value === tone}
            title={toneLabels[tone]}
            onClick={() => onChange(tone)}
            className={cn(
              'inline-flex size-[var(--mors-control-height-sm)] items-center justify-center rounded-[var(--mors-radius-sm)] border transition-colors',
              value === tone
                ? 'border-[var(--mors-color-accent)] bg-[var(--mors-color-accent-soft)]'
                : 'border-[var(--mors-color-border)] bg-[var(--mors-color-surface)] hover:bg-[var(--mors-color-surface-hover)]',
            )}
          >
            <Swatch tone={tone} size={size} />
          </button>
        ))}
      </div>
    </fieldset>
  )
}
