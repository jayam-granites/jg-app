import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { ColumnDef, Row } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableFilterableColumn } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProducts, useDeleteProduct } from '../hooks/use-products'

type VariantRow = {
  id: number
  skuCode: string
  unit: string
  secondaryUnit: string
  attributes: string
  isActive: boolean
}

type ProductRow = {
  id: number
  name: string
  category: string
  isActive: boolean
  variantCount: number
  variants: VariantRow[]
}

function formatAttributes(attrs: any[]): string {
  return attrs
    .map((a) => {
      const name = a.attribute?.name ?? ''
      const value = a.attributeValue?.value ?? ''
      return name && value ? `${name}: ${value}` : ''
    })
    .filter(Boolean)
    .join(', ')
}

function VariantSubTable({ row }: { row: Row<ProductRow> }) {
  const variants = row.original.variants
  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <table className="w-full min-w-[560px] table-fixed text-xs">
        <colgroup>
          <col style={{ width: '18%' }} />
          <col style={{ width: '9%' }} />
          <col />
          <col style={{ width: '12%' }} />
        </colgroup>
        <thead className="bg-muted/40">
          <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">SKU</th>
            <th className="px-3 py-2 text-left font-medium">Unit</th>
            <th className="px-3 py-2 text-left font-medium">Attributes</th>
            <th className="px-3 py-2 text-center font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {variants.map((v) => (
            <tr
              key={v.id}
              className={cn('transition-colors hover:bg-muted/20', !v.isActive && 'opacity-50')}
            >
              <td className="truncate px-3 py-2 font-mono">{v.skuCode}</td>
              <td className="truncate px-3 py-2">
                {v.unit}
                {v.secondaryUnit && (
                  <span className="text-muted-foreground"> / {v.secondaryUnit}</span>
                )}
              </td>
              <td className="truncate px-3 py-2 text-muted-foreground" title={v.attributes}>
                {v.attributes || '—'}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    'inline-flex items-center justify-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    v.isActive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      v.isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                    )}
                  />
                  {v.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProductsPage() {
  const navigate = useNavigate()
  const { data: productsRes, isLoading } = useProducts()
  const deleteProduct = useDeleteProduct()

  const allProducts: ProductRow[] = useMemo(() => {
    const raw = (productsRes as any)?.data ?? []
    return raw
      .map((p: any) => {
      const variantRows: VariantRow[] = (p.variants ?? []).map((v: any) => ({
        id: v.id,
        skuCode: v.skuCode,
        unit: v.unit?.code ?? '',
        secondaryUnit: v.secondaryUnit?.code ?? '',
        attributes: formatAttributes(v.attributes ?? []),
        isActive: v.isActive,
      }))

      return {
        id: p.id,
        name: p.name,
        category: p.category?.name ?? '',
        isActive: p.isActive,
        variantCount: variantRows.length,
        variants: variantRows,
      }
    })
      .sort((a: ProductRow, b: ProductRow) => a.category.localeCompare(b.category))
  }, [productsRes])

  const allCategories = useMemo(
    () => [...new Set(allProducts.map((p) => p.category).filter(Boolean))],
    [allProducts],
  )

  const rowActions: DataTableRowAction<ProductRow>[] = useMemo(
    () => [
      {
        label: 'Edit',
        icon: Pencil,
        onClick: (row) => navigate({ to: `/products/${row.id}/edit` }),
      },
      {
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: (row) => {
          if (!confirm('Delete this product?')) return
          deleteProduct.mutate(row.id, {
            onError: (error: any) => alert(error?.message || 'Failed to delete product'),
          })
        },
      },
    ],
    [navigate, deleteProduct],
  )

  const columns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        id: 'search',
        accessorFn: (row) =>
          `${row.name} ${row.category} ${row.variants.map((v) => v.skuCode).join(' ')} ${row.variants.map((v) => v.attributes).join(' ')}`,
        header: '',
        enableHiding: false,
        enableSorting: false,
        size: 0,
      },
      {
        id: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <button
            className="text-sm font-medium hover:underline cursor-pointer text-left"
            onClick={(e) => {
              e.stopPropagation()
              navigate({ to: `/products/${row.original.id}` })
            }}
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'categoryFilter',
        accessorFn: (row) => row.category,
        header: '',
        enableHiding: false,
        enableSorting: false,
        size: 0,
        filterFn: (row, id, value: string[]) => value.includes(row.getValue(id)),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ getValue }) => {
          const active = getValue() as boolean
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-sm',
                active ? 'text-emerald-600' : 'text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  active ? 'bg-emerald-500' : 'bg-muted-foreground/40',
                )}
              />
              {active ? 'Active' : 'Inactive'}
            </span>
          )
        },
        filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
      },
    ],
    [navigate],
  )

  const filterableColumns: DataTableFilterableColumn<ProductRow>[] = useMemo(
    () => [
      ...(allCategories.length > 0
        ? [
            {
              id: 'categoryFilter',
              title: 'Category',
              options: allCategories.map((cat) => ({ label: cat, value: cat })),
            } as DataTableFilterableColumn<ProductRow>,
          ]
        : []),
      {
        id: 'isActive',
        title: 'Status',
        options: [
          { label: 'Active', value: 'true' },
          { label: 'Inactive', value: 'false' },
        ],
      },
    ],
    [allCategories],
  )

  return (
    <PageLayout
      title="Products"
      description={
        allProducts.length > 0
          ? `${allProducts.length} product${allProducts.length !== 1 ? 's' : ''}`
          : undefined
      }
      action={
        <Button
          onClick={() => navigate({ to: '/products/create' })}
          className="rounded-lg shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={allProducts}
        searchKey={{ id: 'search', placeholder: 'Search by name, category or SKU...' }}
        defaultColumnVisibility={{ search: false, categoryFilter: false }}
        filterableColumns={filterableColumns}
        rowActions={rowActions}
        isLoading={isLoading}
        expandOnRowClick
        groupByKey={(row) => row.category}
        emptyState={{
          title: 'No products found',
          description: 'Try adjusting your search or filters',
        }}
        renderSubComponent={(props) => <VariantSubTable {...props} />}
        getRowCanExpand={(row) => row.variants.length > 0}
        defaultPageSize={10}
      />
    </PageLayout>
  )
}
