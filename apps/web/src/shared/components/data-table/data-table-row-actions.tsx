import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DataTableRowAction } from './types'

type DataTableRowActionsProps<TData> = {
  actions: DataTableRowAction<TData>[]
  row: TData
}

export function DataTableRowActions<TData>({
  actions,
  row,
}: DataTableRowActionsProps<TData>) {
  if (!actions.length) return null

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-md">
          {actions.map((action, idx) => (
            <DropdownMenuItem
              key={idx}
              onClick={() => action.onClick(row)}
              className={cn(
                'text-xs',
                action.variant === 'destructive' && 'text-destructive focus:text-destructive',
              )}
            >
              {action.icon && <action.icon className="mr-2 h-3.5 w-3.5" />}
              {typeof action.label === 'function' ? action.label(row) : action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
