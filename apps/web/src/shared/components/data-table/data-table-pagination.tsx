import { type Table } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  pageSizeOptions?: number[]
}

const DEFAULT_PAGE_SIZES = [10, 20, 50]

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination
  const totalRows = table.getFilteredRowModel().rows.length
  const totalPages = table.getPageCount()
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows)

  if (totalRows === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Left: Rows per page + info */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs">Rows</span>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-16 text-xs rounded-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground/70">
          {startRow}–{endRow} of {totalRows}
        </span>
      </div>

      {/* Right: Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <div className="hidden sm:flex items-center gap-1 px-1">
          {generatePageNumbers(pageIndex, totalPages).map((page, idx) =>
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${idx}`}
                className="flex h-8 w-6 items-center justify-center text-xs text-muted-foreground/50"
              >
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={pageIndex === page ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  'h-8 min-w-8 px-2 text-xs rounded-md',
                  pageIndex === page
                    ? 'font-medium'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => table.setPageIndex(page)}
              >
                {page + 1}
              </Button>
            ),
          )}
        </div>

        <span className="sm:hidden text-xs text-muted-foreground/70 tabular-nums px-1">
          {pageIndex + 1}/{totalPages}
        </span>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-md"
          onClick={() => table.setPageIndex(totalPages - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

function generatePageNumbers(pageIndex: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []
  const maxVisible = 5

  if (totalPages <= maxVisible + 2) {
    for (let i = 0; i < totalPages; i++) pages.push(i)
    return pages
  }

  pages.push(0)

  let start = Math.max(1, pageIndex - 1)
  let end = Math.min(totalPages - 2, pageIndex + 1)

  if (pageIndex <= 2) {
    end = Math.min(maxVisible - 1, totalPages - 2)
  }
  if (pageIndex >= totalPages - 3) {
    start = Math.max(1, totalPages - maxVisible)
  }

  if (start > 1) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages - 2) pages.push('ellipsis')

  pages.push(totalPages - 1)
  return pages
}
