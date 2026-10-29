import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
}

export function TagInput({ value, onChange, placeholder, disabled, error }: TagInputProps) {
  const [input, setInput] = useState('')

  function addTag(tag: string) {
    const trimmed = tag.trim()
    if (!trimmed) return
    if (value.includes(trimmed)) return
    onChange([...value, trimmed])
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
      setInput('')
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm',
        'focus-within:outline-none focus-within:ring-1 focus-within:ring-ring',
        error && 'border-destructive',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {value.map((tag, i) => (
        <Badge
          key={i}
          variant="secondary"
          className="gap-1 rounded-sm px-2 py-0.5 text-xs font-normal"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            disabled={disabled}
            className="ml-0.5 rounded-sm outline-none hover:text-destructive focus-visible:ring-1 focus-visible:ring-ring"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (input) {
            addTag(input)
            setInput('')
          }
        }}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="min-w-[120px] flex-1 border-0 p-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  )
}
