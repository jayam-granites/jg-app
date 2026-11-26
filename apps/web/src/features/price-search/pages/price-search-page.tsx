import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useAuth } from '@/providers/auth'
import { useInventory } from '@/features/inventory/hooks/use-inventory'

type PriceRow = {
  id: number
  variantLabel: string
  searchText: string
  skuCode: string
  unit: string
  minPrice: number | null
  landingPrice: number | null
  maxPrice: number | null
}

type ProductAttribute = {
  attribute?: { name?: string } | null
  attributeValue?: { value?: string } | null
}

type InventoryBatch = {
  id: number
  sellingPriceFrom?: number | string | null
  sellingPriceTo?: number | string | null
  landingPrice?: number | string | null
  productVariant?: {
    id?: number
    skuCode?: string
    product?: { name?: string } | null
    unit?: { code?: string } | null
    attributes?: ProductAttribute[] | null
  } | null
}

/** Values only, so a row reads naturally: "Galaxy Black - Polished". */
function formatVariantValues(attrs: readonly ProductAttribute[]): string {
  return Array.from(
    new Set(
      attrs
        .map((a) => a.attributeValue?.value?.trim() ?? '')
        .filter(Boolean),
    ),
  ).join(' / ')
}

/** Kept for search only, so users can also find variants by attribute name. */
function formatAttributesForSearch(attrs: readonly ProductAttribute[]): string {
  return attrs
    .map((a) => {
      const name = a.attribute?.name?.trim() ?? ''
      const value = a.attributeValue?.value?.trim() ?? ''
      return [name, value].filter(Boolean).join(' ')
    })
    .filter(Boolean)
    .join(' ')
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
  const { hasPermission } = useAuth()
  const canViewCosts = hasPermission('cost_control:read')
  const batches = inventoryRes?.data ?? []

  const tableData: PriceRow[] = useMemo(() => {
    const byVariant = new Map<number, InventoryBatch[]>()

    for (const batch of batches as InventoryBatch[]) {
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
        if (!variant) return null

        const fromPrices = variantBatches
          .map((b) => toPrice(b.sellingPriceFrom))
          .filter((n): n is number => n !== null)
        const toPrices = variantBatches
          .map((b) => toPrice(b.sellingPriceTo))
          .filter((n): n is number => n !== null)
        const landingPrices = variantBatches
          .map((b) => toPrice(b.landingPrice))
          .filter((n): n is number => n !== null)

        const productName = variant.product?.name ?? '—'
        const variantValues = formatVariantValues(variant.attributes ?? [])
        const variantLabel = variantValues ? `${productName} - ${variantValues}` : productName
        const skuCode = variant.skuCode ?? ''
        const unit = variant.unit?.code ?? ''
        const searchText = [
          variantLabel,
          productName,
          variantValues,
          formatAttributesForSearch(variant.attributes ?? []),
          skuCode,
          unit,
        ]
          .filter(Boolean)
          .join(' ')

        return {
          id: variantId,
          variantLabel,
          searchText,
          skuCode,
          unit,
          minPrice: fromPrices.length > 0 ? Math.min(...fromPrices) : null,
          landingPrice: landingPrices.length > 0 ? landingPrices[0] : null,
          maxPrice: toPrices.length > 0 ? Math.max(...toPrices) : null,
        }
      })
      .filter((row): row is PriceRow => row !== null)
      .sort((a, b) => a.variantLabel.localeCompare(b.variantLabel))
  }, [batches])

  const columns = useMemo<ColumnDef<PriceRow>[]>(
    () => {
      const landingPriceColumn: ColumnDef<PriceRow> = {
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
      }

      return [
        {
          id: 'search',
          accessorFn: (row) => row.searchText,
          header: '',
          enableHiding: false,
          enableSorting: false,
          size: 0,
        },
        {
          accessorKey: 'variantLabel',
          header: 'Product / Variant',
          cell: ({ row }) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{row.original.variantLabel}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {[row.original.skuCode, row.original.unit].filter(Boolean).join(' · ')}
              </span>
            </div>
          ),
        },
        {
          accessorKey: 'minPrice',
          header: 'Min Price',
          cell: ({ getValue }) => (
            <span className="text-sm font-medium tabular-nums">
              {formatPrice(getValue() as number | null)}
            </span>
          ),
          sortingFn: (a, b) =>
            (a.original.minPrice ?? Number.POSITIVE_INFINITY) -
            (b.original.minPrice ?? Number.POSITIVE_INFINITY),
        },
        ...(canViewCosts ? [landingPriceColumn] : []),
        {
          accessorKey: 'maxPrice',
          header: 'Max Price',
          cell: ({ getValue }) => (
            <span className="text-sm font-medium tabular-nums">
              {formatPrice(getValue() as number | null)}
            </span>
          ),
          sortingFn: (a, b) =>
            (a.original.maxPrice ?? Number.POSITIVE_INFINITY) -
            (b.original.maxPrice ?? Number.POSITIVE_INFINITY),
        },
      ]
    },
    [canViewCosts],
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
        searchKey={{ id: 'search', placeholder: 'Search by name, variant, SKU or unit...' }}
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
