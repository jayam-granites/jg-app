import type { Column } from '@tanstack/react-table'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={cn('text-xs font-medium', className)}>{title}</span>
  }

  const sortDirection = column.getIsSorted()

  function handleToggleSort() {
    if (sortDirection === false) {
      column.toggleSorting(false)
    } else if (sortDirection === 'asc') {
      column.toggleSorting(true)
    } else {
      column.clearSorting()
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        '-ml-3 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground',
        sortDirection && 'text-foreground',
        className,
      )}
      onClick={handleToggleSort}
    >
      <span>{title}</span>
      {sortDirection === 'asc' ? (
        <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
      ) : sortDirection === 'desc' ? (
        <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
      ) : (
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 text-muted-foreground/30" />
      )}
    </Button>
  )
}
