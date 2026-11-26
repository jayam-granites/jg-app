import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Package, Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useAuth } from '@/providers/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useInventory } from '../hooks/use-inventory'

type InventoryRow = {
  id: number
  batchNo: string
  product: string
  skuCode: string
  totalQty: number
  availableQty: number
  damagedQty: number | null
  buyingPrice: number
  landingPrice: number
  slabCount: number | null
}

type InventoryBatch = {
  id: number
  batchNo: string
  productVariant?: {
    product?: { name?: string } | null
    skuCode?: string
  } | null
  totalQty: number | string
  availableQty: number | string
  damagedQty?: number | string | null
  buyingPrice: number | string
  landingPrice: number | string
  slabCount?: number | null
}

export function InventoryListPage() {
  const navigate = useNavigate()
  const { data: inventoryRes, isLoading } = useInventory()
  const { hasPermission } = useAuth()
  const canViewCosts = hasPermission('cost_control:read')
  const batches = inventoryRes?.data ?? []

  const tableData: InventoryRow[] = useMemo(() => {
    return (batches as InventoryBatch[]).map((b) => ({
      id: b.id,
      batchNo: b.batchNo,
      product: b.productVariant?.product?.name ?? '-',
      skuCode: b.productVariant?.skuCode ?? '-',
      totalQty: Number(b.totalQty),
      availableQty: Number(b.availableQty),
      damagedQty: b.damagedQty ? Number(b.damagedQty) : null,
      buyingPrice: Number(b.buyingPrice),
      landingPrice: Number(b.landingPrice),
      slabCount: b.slabCount ?? null,
    }))
  }, [batches])

  const rowActions = useMemo(
    () => [
      {
        label: 'View Batch',
        icon: Package,
        onClick: (item: InventoryRow) => navigate({ to: `/inventory/${item.id}` }),
      },
    ],
    [navigate],
  )

  const columns = useMemo<ColumnDef<InventoryRow>[]>(
    () => {
      const landingPriceColumn: ColumnDef<InventoryRow> = {
        accessorKey: 'landingPrice',
        header: 'Landing Price',
        cell: ({ getValue }) => {
          const val = getValue() as number
          return <span className="text-sm">₹{val.toLocaleString()}</span>
        },
      }

      return [
        {
          accessorKey: 'product',
          header: 'Product',
          cell: ({ getValue }) => (
            <span className="text-sm font-medium">{getValue() as string}</span>
          ),
        },
        {
          accessorKey: 'skuCode',
          header: 'SKU',
          cell: ({ getValue }) => (
            <span className="font-mono text-sm text-muted-foreground">{getValue() as string}</span>
          ),
        },
        {
          accessorKey: 'batchNo',
          header: 'Batch',
          cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
        },
        {
          accessorKey: 'totalQty',
          header: 'Total Qty',
          cell: ({ getValue }) => <span className="text-sm">{getValue() as number}</span>,
        },
        {
          accessorKey: 'availableQty',
          header: 'Available',
          cell: ({ getValue }) => {
            const qty = getValue() as number
            return (
              <span className={`text-sm font-medium ${qty <= 0 ? 'text-destructive' : 'text-success'}`}>
                {qty}
              </span>
            )
          },
        },
        {
          accessorKey: 'slabCount',
          header: 'Slabs',
          cell: ({ getValue }) => {
            const val = getValue() as number | null
            return <span className="text-sm">{val ?? '-'}</span>
          },
        },
        ...(canViewCosts ? [landingPriceColumn] : []),
        {
          accessorKey: 'availableQty',
          header: 'Status',
          cell: ({ getValue }) => {
            const qty = getValue() as number
            return (
              <Badge
                variant="outline"
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  qty <= 0
                    ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : 'bg-success/12 text-success border-success/30'
                }`}
              >
                {qty <= 0 ? 'Out of Stock' : 'In Stock'}
              </Badge>
            )
          },
        },
      ]
    },
    [canViewCosts],
  )

  return (
    <PageLayout
      title="Inventory"
      description="View and manage inventory batches"
      action={
        <Button onClick={() => navigate({ to: '/inventory/create' })} className="rounded-lg shadow-xs">
          <Plus className="mr-2 size-4" /> New Inventory
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'product', placeholder: 'Search inventory...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={(row) => navigate({ to: `/inventory/${row.id}` })}
        emptyState={{
          title: 'No inventory found',
          description: 'Inventory is created automatically when you create purchase receipts or add new inventory',
        }}
      />
    </PageLayout>
  )
}
