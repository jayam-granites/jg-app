import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Package, Plus } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
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

export function InventoryListPage() {
  const navigate = useNavigate()
  const { data: inventoryRes, isLoading } = useInventory()
  const batches = inventoryRes?.data ?? []

  const tableData: InventoryRow[] = useMemo(() => {
    return batches.map((b: any) => ({
      id: b.id,
      batchNo: b.batchNo,
      product: b.productVariant?.product?.name ?? '-',
      skuCode: b.productVariant?.skuCode ?? '-',
      totalQty: Number(b.totalQty),
      availableQty: Number(b.availableQty),
      damagedQty: b.damagedQty ? Number(b.damagedQty) : null,
      buyingPrice: Number(b.buyingPrice),
      landingPrice: Number(b.landingPrice),
      slabCount: b.slabCount,
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

  const columns: ColumnDef<InventoryRow>[] = useMemo(
    () => [
      {
        accessorKey: 'product',
        header: 'Product',
        cell: ({ getValue }) => <span className="text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'skuCode',
        header: 'SKU',
        cell: ({ getValue }) => <span className="font-mono text-sm text-muted-foreground">{getValue() as string}</span>,
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
            <span className={`text-sm font-medium ${qty <= 0 ? 'text-destructive' : 'text-green-600'}`}>
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
      {
        accessorKey: 'landingPrice',
        header: 'Landing Price',
        cell: ({ getValue }) => {
          const val = getValue() as number
          return <span className="text-sm">₹{val.toLocaleString()}</span>
        },
      },
      {
        accessorKey: 'availableQty',
        header: 'Status',
        cell: ({ getValue }) => {
          const qty = getValue() as number
          return (
            <Badge
              variant="outline"
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                qty <= 0
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : 'bg-green-100 text-green-800 border-green-200'
              }`}
            >
              {qty <= 0 ? 'Out of Stock' : 'In Stock'}
            </Badge>
          )
        },
      },
    ],
    [],
  )

  return (
    <PageLayout
      title="Inventory"
      description="View and manage inventory batches"
      action={
        <Button onClick={() => navigate({ to: '/inventory/create' })} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> New Inventory
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
