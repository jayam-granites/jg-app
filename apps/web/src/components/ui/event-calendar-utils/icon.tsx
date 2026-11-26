import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type IconName = 'chevron-left' | 'chevron-right' | 'trash' | 'edit' | 'plus'

const icons = {
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  trash: Trash2,
  edit: Pencil,
  plus: Plus,
} as const

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const Component = icons[name]
  return <Component aria-hidden="true" className={cn('size-4', className)} />
}
