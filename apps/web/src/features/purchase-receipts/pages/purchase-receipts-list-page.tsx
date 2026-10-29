import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus, Eye, Trash2 } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { Button } from '@/components/ui/button'
import { usePurchaseReceipts, useDeletePurchaseReceipt } from '../hooks/use-purchase-receipts'
import { formatDateTime } from '@/lib/date'

type ReceiptRow = {
  id: number
  receiptNumber: string
  poNumber: string
  supplier: string
  receivedDate: string
  totalSlabs: number | null
  totalSqfts: number | null
  netTotal: number | null
  gstInvoiceTotal: number | null
  cashPortion: number | null
  itemCount: number
}

export function PurchaseReceiptsListPage() {
  const navigate = useNavigate()
  const { data: receiptsRes, isLoading } = usePurchaseReceipts()
  const deleteReceipt = useDeletePurchaseReceipt()
  const receipts = receiptsRes?.data ?? []

  const tableData: ReceiptRow[] = useMemo(() => {
    return receipts.map((r: any) => ({
      id: r.id,
      receiptNumber: r.receiptNumber,
      poNumber: r.purchaseOrder?.poNumber ?? '-',
      supplier: r.purchaseOrder?.supplier?.name ?? '-',
      receivedDate: r.receivedDate,
      totalSlabs: r.totalSlabs,
      totalSqfts: r.totalSqfts,
      netTotal: r.netTotal,
      gstInvoiceTotal: r.gstInvoiceTotal,
      cashPortion: r.cashPortion,
      itemCount: r.items?.length ?? 0,
    }))
  }, [receipts])

  const rowActions: DataTableRowAction<ReceiptRow>[] = useMemo(
    () => [
      {
        label: 'View',
        icon: Eye,
        onClick: (item) => navigate({ to: `/purchase/receipts/${item.id}` }),
      },
      {
        label: 'Delete',
        icon: Trash2,
        onClick: (item) => {
          if (confirm(`Delete receipt ${item.receiptNumber}?`)) {
            deleteReceipt.mutate(item.id)
          }
        },
      },
    ],
    [navigate, deleteReceipt],
  )

  const columns: ColumnDef<ReceiptRow>[] = useMemo(
    () => [
      {
        accessorKey: 'receiptNumber',
        header: 'Receipt #',
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'poNumber',
        header: 'PO Number',
        cell: ({ getValue }) => <span className="font-mono text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'supplier',
        header: 'Supplier',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'receivedDate',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{formatDateTime(getValue() as string)}</span>
        ),
      },
      {
        id: 'slabs',
        header: 'Slabs / Sq Ft',
        cell: ({ row }) => (
          <span className="text-sm">{row.original.totalSlabs ?? 0} / {Number(row.original.totalSqfts ?? 0).toFixed(3)}</span>
        ),
      },
      {
        accessorKey: 'netTotal',
        header: 'Net Total',
        cell: ({ getValue }) => (
          <span className="text-sm font-medium">₹{Number(getValue() ?? 0).toLocaleString()}</span>
        ),
      },
      {
        id: 'payment',
        header: 'Bill / Cash',
        cell: ({ row }) => (
          <span className="text-sm">
            ₹{Number(row.original.gstInvoiceTotal ?? 0).toLocaleString()} / ₹{Number(row.original.cashPortion ?? 0).toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  )

  return (
    <PageLayout
      title="Purchase Receipts"
      description="Record goods received from suppliers"
      action={
        <Button onClick={() => navigate({ to: '/purchase/receipts/create' })} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> Create Receipt
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'receiptNumber', placeholder: 'Search receipts...' }}
        rowActions={rowActions}
        isLoading={isLoading}
        onRowClick={(row) => navigate({ to: `/purchase/receipts/${row.id}` })}
        emptyState={{
          title: 'No receipts found',
          description: 'Create your first purchase receipt to record incoming goods',
        }}
      />
    </PageLayout>
  )
}
