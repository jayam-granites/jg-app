import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useInventory } from '@/features/inventory/hooks/use-inventory'

type PriceRow = {
  id: number
  product: string
  variant: string
  skuCode: string
  unit: string
  minPrice: number | null
  landingPrice: number | null
  maxPrice: number | null
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

function toPrice(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function formatPrice(value: number | null): string {
  if (value === null) return '—'
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function PriceSearchPage() {
  const { data: inventoryRes, isLoading } = useInventory()
  const batches = inventoryRes?.data ?? []

  const tableData: PriceRow[] = useMemo(() => {
    const byVariant = new Map<number, any[]>()

    for (const batch of batches) {
      const variant = batch.productVariant
      if (!variant?.id) continue
      const existing = byVariant.get(variant.id)
      if (existing) existing.push(batch)
      else byVariant.set(variant.id, [batch])
    }

    return Array.from(byVariant.entries())
      .map(([variantId, variantBatches]) => {
        const latest = variantBatches[0]
        const variant = latest.productVariant

        const fromPrices = variantBatches
          .map((b) => toPrice(b.sellingPriceFrom))
          .filter((n): n is number => n !== null)
        const toPrices = variantBatches
          .map((b) => toPrice(b.sellingPriceTo))
          .filter((n): n is number => n !== null)
        const landingPrices = variantBatches
          .map((b) => toPrice(b.landingPrice))
          .filter((n): n is number => n !== null)

        const attributes = formatAttributes(variant.attributes ?? [])

        return {
          id: variantId,
          product: variant.product?.name ?? '—',
          variant: attributes || variant.skuCode || '—',
          skuCode: variant.skuCode ?? '—',
          unit: variant.unit?.code ?? '',
          minPrice: fromPrices.length > 0 ? Math.min(...fromPrices) : null,
          landingPrice: landingPrices.length > 0 ? landingPrices[0] : null,
          maxPrice: toPrices.length > 0 ? Math.max(...toPrices) : null,
        }
      })
      .sort((a, b) => {
        const byProduct = a.product.localeCompare(b.product)
        return byProduct !== 0 ? byProduct : a.variant.localeCompare(b.variant)
      })
  }, [batches])

  const columns: ColumnDef<PriceRow>[] = useMemo(
    () => [
      {
        id: 'search',
        accessorFn: (row) => `${row.product} ${row.variant} ${row.skuCode} ${row.unit}`,
        header: '',
        enableHiding: false,
        enableSorting: false,
        size: 0,
      },
      {
        accessorKey: 'product',
        header: 'Product',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{row.original.product}</span>
            <span className="font-mono text-xs text-muted-foreground">{row.original.skuCode}</span>
          </div>
        ),
      },
      {
        accessorKey: 'variant',
        header: 'Variant',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm">{row.original.variant}</span>
            {row.original.unit && (
              <span className="text-xs text-muted-foreground">{row.original.unit}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'minPrice',
        header: 'Min Price',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium tabular-nums">{formatPrice(getValue() as number | null)}</span>
        ),
        sortingFn: (a, b) =>
          (a.original.minPrice ?? Number.POSITIVE_INFINITY) -
          (b.original.minPrice ?? Number.POSITIVE_INFINITY),
      },
      {
        accessorKey: 'landingPrice',
        header: 'Landing Cost',
        cell: ({ getValue }) => (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatPrice(getValue() as number | null)}
          </span>
        ),
        sortingFn: (a, b) =>
          (a.original.landingPrice ?? Number.POSITIVE_INFINITY) -
          (b.original.landingPrice ?? Number.POSITIVE_INFINITY),
      },
      {
        accessorKey: 'maxPrice',
        header: 'Max Price',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium tabular-nums">{formatPrice(getValue() as number | null)}</span>
        ),
        sortingFn: (a, b) =>
          (a.original.maxPrice ?? Number.POSITIVE_INFINITY) -
          (b.original.maxPrice ?? Number.POSITIVE_INFINITY),
      },
    ],
    [],
  )

  return (
    <PageLayout
      title="Price Search"
      description={
        tableData.length > 0
          ? `${tableData.length} variant${tableData.length !== 1 ? 's' : ''} from inventory`
          : undefined
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'search', placeholder: 'Search by product, variant or SKU...' }}
        defaultColumnVisibility={{ search: false, landingPrice: false }}
        isLoading={isLoading}
        emptyState={{
          title: 'No prices found',
          description: 'Prices appear here once inventory batches are available',
        }}
        defaultPageSize={10}
      />
    </PageLayout>
  )
}
