export type DataTableFilterOption = {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type DataTableFilterableColumn<_TData> = {
  id: string
  title: string
  options: DataTableFilterOption[]
}

export type DataTableRowAction<TData> = {
  label: string | ((row: TData) => string)
  icon?: React.ComponentType<{ className?: string }>
  onClick: (row: TData) => void
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
}

export type DataTableBulkAction<TData> = {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: (rows: TData[]) => void
  variant?: 'default' | 'destructive' | 'outline'
}

export type DataTableSearchKey = {
  id: string
  placeholder?: string
}

export type DataTableEmptyState = {
  title?: string
  description?: string
}

export type DataTableGroupByKey<TData> = (row: TData) => string
