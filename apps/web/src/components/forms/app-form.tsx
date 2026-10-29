import { type ReactNode } from 'react'
import { useForm } from '@tanstack/react-form'
import { safeParse } from 'valibot'
import type { BaseSchema, BaseIssue } from 'valibot'

type Schema = BaseSchema<unknown, unknown, BaseIssue<unknown>>
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type FormFieldConfig = {
  name: string
  label: string
  type?: string
  placeholder?: string
}

type AppFormProps = {
  fields: FormFieldConfig[]
  schema: Schema
  onSubmit: (value: Record<string, unknown>) => void | Promise<void>
  submitLabel?: string
  isSubmitting?: boolean
  children?: ReactNode
}

function formatIssues(issues: unknown[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const issue of issues) {
    const i = issue as { path?: { key: string | number }[]; message: string }
    const key = String(i.path?.[0]?.key ?? '')
    result[key] = i.message
  }
  return result
}

export function AppForm({
  fields,
  schema,
  onSubmit,
  submitLabel = 'Submit',
  isSubmitting,
  children,
}: AppFormProps) {
  const form = useForm({
    defaultValues: {} as Record<string, unknown>,
    validators: {
      onChange({ value }) {
        const result = safeParse(schema, value)
        return result.issues ? formatIssues(result.issues) : undefined
      },
    },
    onSubmit: async ({ value }) => onSubmit(value),
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-4"
    >
      {fields.map((field) => (
        <form.Field key={field.name} name={field.name}>
          {(fieldApi) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                value={(fieldApi.state.value as string) ?? ''}
                onBlur={fieldApi.handleBlur}
                onChange={(e) => fieldApi.handleChange(e.target.value)}
                className={cn(fieldApi.state.meta.errors && 'border-destructive')}
              />
              {fieldApi.state.meta.errors ? (
                <p className="text-sm text-destructive">{fieldApi.state.meta.errors.join(', ')}</p>
              ) : null}
            </div>
          )}
        </form.Field>
      ))}
      {children}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting...' : submitLabel}
      </Button>
    </form>
  )
}
