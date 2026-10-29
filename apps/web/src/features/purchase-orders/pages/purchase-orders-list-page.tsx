import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Eye } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { usePurchaseOrders } from '../hooks/use-purchase-orders'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { formatDate, formatDateTime } from '@/lib/date'

type PurchaseOrderRow = {
  id: number
  poNumber: string
  supplier: string
  orderDate: string
  expectedDate: string | null
  status: string
  grandTotal: number | null
  itemCount: number
}

export function PurchaseOrdersListPage() {
  const navigate = useNavigate()
  const { data: ordersRes, isLoading } = usePurchaseOrders()
  const { data: statusOptionsRes } = useLookupOptions(LOOKUP_GROUPS.PURCHASE_ORDER_STATUS)
  const orders = ordersRes?.data ?? []
  const statusMap = useMemo(
    () => lookupOptionMap(statusOptionsRes?.data?.[LOOKUP_GROUPS.PURCHASE_ORDER_STATUS] ?? []),
    [statusOptionsRes],
  )

  const tableData: PurchaseOrderRow[] = useMemo(() => {
    return orders.map((o: any) => ({
      id: o.id,
      poNumber: o.poNumber,
      supplier: o.supplier?.name ?? '-',
      orderDate: o.orderDate,
      expectedDate: o.expectedDate,
      status: o.status,
      grandTotal: o.grandTotal ? Number(o.grandTotal) : null,
      itemCount: o.items?.length ?? 0,
    }))
  }, [orders])

  const rowActions: DataTableRowAction<PurchaseOrderRow>[] = useMemo(
    () => [
      {
        label: 'View',
        icon: Eye,
        onClick: (item) => navigate({ to: `/purchase/orders/${item.id}` }),
      },
    ],
    [navigate],
  )

  const columns: ColumnDef<PurchaseOrderRow>[] = useMemo(
    () => [
      {
        accessorKey: 'poNumber',
        header: 'PO Number',
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'orderDate',
        header: 'Order Date',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(getValue() as string)}</span>
        ),
      },
      {
        accessorKey: 'expectedDate',
        header: 'Expected',
        cell: ({ getValue }) => {
          const val = getValue() as string | null
          return val ? (
            <span className="text-sm text-muted-foreground">{formatDate(val)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        },
      },
      {
        accessorKey: 'itemCount',
        header: 'Items',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as number}</span>,
      },
      {
        accessorKey: 'grandTotal',
        header: 'Total',
        cell: ({ getValue }) => {
          const val = getValue() as number | null
          return <span className="text-sm font-medium">{val != null ? `₹${val.toLocaleString()}` : '-'}</span>
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string
          const opt = statusMap.get(status)
          return (
            <Badge variant="outline" className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${optionColorClasses(opt)}`}>
              {opt?.label ?? status.replace('_', ' ')}
            </Badge>
          )
        },
        filterFn: (row, id, value: string[]) => value.includes(String(row.getValue(id))),
      },
    ],
    [statusMap],
  )

  return (
    <PageLayout
      title="Purchase Orders"
      description="Manage purchase orders to suppliers"
      action={
        <Button onClick={() => navigate({ to: '/purchase/orders/create' })} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create PO
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'poNumber', placeholder: 'Search by PO number...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={(row) => navigate({ to: `/purchase/orders/${row.id}` })}
        emptyState={{
          title: 'No purchase orders found',
          description: 'Create your first purchase order to get started',
        }}
      />
    </PageLayout>
  )
}
