import { type Table } from '@tanstack/react-table'
import { Search, X, Columns3, SlidersHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import type { DataTableFilterableColumn, DataTableSearchKey } from './types'

type DataTableToolbarProps<TData> = {
  table: Table<TData>
  searchKey?: DataTableSearchKey
  filterableColumns?: DataTableFilterableColumn<TData>[]
  enableColumnVisibility?: boolean
  children?: React.ReactNode
}

function getColumnLabel(column: any): string {
  const def = column.columnDef
  if (typeof def.header === 'string') return def.header
  return column.id
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
  filterableColumns,
  enableColumnVisibility = true,
  children,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    searchKey &&
    table.getColumn(searchKey.id)?.getFilterValue() !== undefined

  const hasColumnFilters = filterableColumns?.some(
    (col) => table.getColumn(col.id)?.getFilterValue() !== undefined,
  )

  const showReset = isFiltered || hasColumnFilters

  const hasFilters = (filterableColumns?.length ?? 0) > 0

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      {searchKey && (
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <input
            placeholder={searchKey.placeholder ?? 'Search...'}
            className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-8 text-sm transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={(table.getColumn(searchKey.id)?.getFilterValue() as string) ?? ''}
            onChange={(e) => {
              table.getColumn(searchKey.id)?.setFilterValue(e.target.value)
              table.setPageIndex(0)
            }}
          />
          {!!table.getColumn(searchKey.id)?.getFilterValue() && (
            <button
              onClick={() => {
                table.getColumn(searchKey.id)?.setFilterValue('')
                table.setPageIndex(0)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground/60 hidden sm:block" />
          {filterableColumns?.map((column) => {
            const tableColumn = table.getColumn(column.id)
            if (!tableColumn) return null
            return (
              <DataTableFacetedFilter
                key={column.id}
                column={tableColumn}
                title={column.title}
                options={column.options}
              />
            )
          })}
        </div>
      )}

      {showReset && (
        <button
          className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => {
            table.resetColumnFilters()
            table.setPageIndex(0)
          }}
        >
          Reset
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1 min-w-4" />

      {/* Children (actions etc.) */}
      {children}

      {/* Column visibility */}
      {enableColumnVisibility && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-md text-xs font-medium">
              <Columns3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              Toggle columns
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {table
              .getAllColumns()
              .filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide())
              .map((col) => {
                const label = getColumnLabel(col)
                return (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    className="capitalize text-xs"
                    checked={col.getIsVisible()}
                    onCheckedChange={(value: boolean) => col.toggleVisibility(!!value)}
                  >
                    {typeof label === 'string' ? label : col.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
