import { useState, useCallback, type ReactNode } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getExpandedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type ExpandedState,
  type RowSelectionState,
  type Row,
} from '@tanstack/react-table'
import { ChevronDown, Inbox, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DataTableToolbar } from './data-table-toolbar'
import { DataTableColumnHeader } from './data-table-column-header'
import { DataTablePagination } from './data-table-pagination'
import { DataTableRowActions } from './data-table-row-actions'
import type {
  DataTableFilterableColumn,
  DataTableRowAction,
  DataTableBulkAction,
  DataTableSearchKey,
  DataTableEmptyState,
  DataTableGroupByKey,
} from './types'

export type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  searchKey?: string | DataTableSearchKey
  filterableColumns?: DataTableFilterableColumn<TData>[]
  rowActions?: DataTableRowAction<TData>[]
  bulkActions?: DataTableBulkAction<TData>[]
  emptyState?: DataTableEmptyState
  error?: boolean
  errorState?: DataTableEmptyState
  isLoading?: boolean
  onRowClick?: (row: TData) => void
  renderSubComponent?: (props: { row: Row<TData> }) => ReactNode
  getRowCanExpand?: (row: TData) => boolean
  expandOnRowClick?: boolean
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  defaultPageSize?: number
  pageSizeOptions?: number[]
  defaultColumnVisibility?: VisibilityState
  toolbarChildren?: ReactNode
  groupByKey?: DataTableGroupByKey<TData>
}

function normalizeSearchKey(key?: string | DataTableSearchKey): DataTableSearchKey | undefined {
  if (!key) return undefined
  if (typeof key === 'string') return { id: key }
  return key
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  filterableColumns,
  rowActions,
  bulkActions,
  emptyState,
  error,
  errorState,
  isLoading,
  onRowClick,
  renderSubComponent,
  getRowCanExpand,
  expandOnRowClick,
  enableRowSelection = false,
  enableColumnVisibility = true,
  defaultPageSize = 10,
  pageSizeOptions,
  defaultColumnVisibility,
  toolbarChildren,
  groupByKey,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    defaultColumnVisibility ?? {},
  )
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const normalizedSearchKey = normalizeSearchKey(searchKey)

  const allColumns: ColumnDef<TData>[] = []

  if (enableRowSelection) {
    allColumns.push({
      id: 'select',
      size: 44,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/30"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-muted-foreground/30 text-primary focus:ring-primary/30"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          aria-label="Select row"
        />
      ),
    })
  }

  if (renderSubComponent) {
    allColumns.push({
      id: 'expander',
      size: 44,
      header: () => null,
      cell: ({ row }) =>
        row.getCanExpand() ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              row.toggleExpanded()
            }}
            className="flex items-center justify-center p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Toggle expand"
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                row.getIsExpanded() && 'rotate-180',
              )}
            />
          </button>
        ) : null,
    })
  }

  allColumns.push(...columns)

  const handleColumnFiltersChange = useCallback(
    (updater: ColumnFiltersState | ((prev: ColumnFiltersState) => ColumnFiltersState)) => {
      setColumnFilters(updater)
    },
    [],
  )

  const table = useReactTable({
    data,
    columns: allColumns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      expanded,
      rowSelection,
      pagination: { pageIndex: 0, pageSize: defaultPageSize },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: getRowCanExpand ? (row) => getRowCanExpand(row.original) : undefined,
    enableRowSelection,
    enableMultiRowSelection: enableRowSelection,
    getRowId: (row: any) => row.id ?? row._id ?? crypto.randomUUID(),
  })

  const selectedRows = table.getSelectedRowModel().rows.map((r) => r.original)

  const rowCount = table.getRowModel().rows.length
  const columnCount = allColumns.length

  function renderSkeletonRows() {
    return Array.from({ length: 5 }).map((_, rowIdx) => (
      <TableRow key={`skeleton-${rowIdx}`} className="pointer-events-none">
        {Array.from({ length: columnCount }).map((_, colIdx) => (
          <TableCell key={colIdx} className="py-3">
            <div
              className="h-4 animate-pulse rounded bg-muted/60"
              style={{ width: `${40 + Math.random() * 60}%`, maxWidth: 160 }}
            />
          </TableCell>
        ))}
      </TableRow>
    ))
  }

  function renderEmptyState() {
    return (
      <TableRow>
        <TableCell colSpan={columnCount} className="h-40 text-center">
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Inbox className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm font-medium">{emptyState?.title ?? 'No data'}</p>
            {emptyState?.description && (
              <p className="text-xs text-muted-foreground/60 max-w-xs">{emptyState.description}</p>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  function renderErrorState() {
    return (
      <TableRow>
        <TableCell colSpan={columnCount} className="h-40 text-center">
          <div className="flex flex-col items-center justify-center gap-2 py-8">
            <AlertCircle className="h-10 w-10 text-destructive/40" />
            <p className="text-sm font-medium text-destructive">
              {errorState?.title ?? 'Something went wrong'}
            </p>
            {errorState?.description && (
              <p className="text-xs text-muted-foreground/60 max-w-xs">{errorState.description}</p>
            )}
          </div>
        </TableCell>
      </TableRow>
    )
  }

  function renderBody() {
    if (isLoading) return renderSkeletonRows()
    if (error) return renderErrorState()
    if (!rowCount) return renderEmptyState()

    let prevGroup: string | undefined

    return table.getRowModel().rows.flatMap((row: Row<TData>) => {
      const rows: ReactNode[] = []

      const group = groupByKey?.(row.original)
      if (group !== undefined && group !== prevGroup) {
        rows.push(
          <TableRow key={`group-${group}`} className="bg-muted/30 hover:bg-muted/30">
            <TableCell colSpan={columnCount} className="py-2 px-4 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
              {group}
            </TableCell>
          </TableRow>,
        )
        prevGroup = group
      }

      rows.push(
        <TableRow
          key={row.id}
          data-state={row.getIsSelected() && 'selected'}
          className={cn(
            onRowClick && 'cursor-pointer',
            row.getIsExpanded() && 'border-b-0',
          )}
          onClick={() => {
            if (expandOnRowClick && row.getCanExpand()) {
              row.toggleExpanded()
            }
            onRowClick?.(row.original)
          }}
        >
          {row.getVisibleCells().map((cell) => (
            <TableCell
              key={cell.id}
              className={cn(
                'py-3',
                row.getIsExpanded() && 'border-b-0',
              )}
            >
              {cell.column.id === 'actions' && rowActions
                ? <DataTableRowActions actions={rowActions} row={row.original} />
                : flexRender(cell.column.columnDef.cell, cell.getContext())}
            </TableCell>
          ))}
        </TableRow>,
      )

      if (row.getIsExpanded() && renderSubComponent) {
        rows.push(
          <TableRow key={`${row.id}-expanded`} className="hover:bg-transparent">
            <TableCell
              colSpan={columnCount}
              className="bg-muted/10 p-4 pt-0"
            >
              {renderSubComponent({ row })}
            </TableCell>
          </TableRow>,
        )
      }

      return rows
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {(normalizedSearchKey || filterableColumns?.length || toolbarChildren || bulkActions?.length) && (
        <DataTableToolbar
          table={table}
          searchKey={normalizedSearchKey}
          filterableColumns={filterableColumns}
          enableColumnVisibility={enableColumnVisibility}
        >
          {bulkActions && selectedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {selectedRows.length} selected
              </span>
              {bulkActions.map((action, idx) => (
                <button
                  key={idx}
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                    action.variant === 'destructive'
                      ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'bg-primary/10 text-primary hover:bg-primary/20',
                  )}
                  onClick={() => action.onClick(selectedRows)}
                >
                  {action.icon && <action.icon className="h-3.5 w-3.5" />}
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {toolbarChildren}
        </DataTableToolbar>
      )}

      {/* Table card */}
      <div className="relative overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="[&_tr]:border-b-border/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => {
                    const isActionColumn =
                      header.id === 'actions' || header.id === 'select' || header.id === 'expander'
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'h-10 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
                          isActionColumn && 'w-12',
                        )}
                        style={{
                          width: header.getSize() !== 150 ? header.getSize() : undefined,
                          minWidth: isActionColumn ? 44 : undefined,
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : header.column.columnDef.header === '' ||
                            header.column.columnDef.header === null
                            ? flexRender(header.column.columnDef.header, header.getContext())
                            : typeof header.column.columnDef.header === 'string'
                              ? (
                                <DataTableColumnHeader
                                  column={header.column}
                                  title={header.column.columnDef.header}
                                />
                              )
                              : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {renderBody()}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <DataTablePagination
        table={table}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  )
}
