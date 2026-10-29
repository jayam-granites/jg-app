import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, FileText, Plus, ReceiptText, Trash2, Truck, Users } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction, DataTableBulkAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useInvoices, useDeleteInvoice } from '@/features/invoices/hooks/use-invoices'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { formatDateTime } from '@/lib/date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { previewPdf } from '@/lib/pdf'
import { buildInvoicePdf, buildOriginalBillPdf, buildTransportBillPdf } from '../lib/invoice-pdf'
import { CloseSaleDialog } from '../components/close-sale-dialog'
import { BrokerCommissionDialog } from '../components/broker-commission-dialog'

type InvoiceRow = {
  id: number
  invoiceNumber: string
  customerName: string
  status: string
  grandTotal: number
  receivedAmount: number
  discountAmount: number
  balanceAmount: number
  paymentMethod: string | null
  createdAt: string
}

function InvoicesListPage() {
  const navigate = useNavigate()
  const { data: invoicesRes, isLoading } = useInvoices()
  const { data: statusOptionsRes } = useLookupOptions(LOOKUP_GROUPS.INVOICE_STATUS)
  const deleteInvoice = useDeleteInvoice()
  const [closeSaleInvoice, setCloseSaleInvoice] = useState<any | null>(null)
  const [commissionInvoice, setCommissionInvoice] = useState<InvoiceRow | null>(null)

  const invoices = invoicesRes?.data ?? []
  const statusMap = useMemo(
    () => lookupOptionMap(statusOptionsRes?.data?.[LOOKUP_GROUPS.INVOICE_STATUS] ?? []),
    [statusOptionsRes],
  )

  const tableData: InvoiceRow[] = useMemo(() => {
    return invoices.map((m: any) => ({
      id: m.id,
      invoiceNumber: m.invoiceNumber,
      customerName: m.customer?.name ?? '—',
      status: m.status,
      grandTotal: Number(m.grandTotal) || 0,
      receivedAmount: Number(m.receivedAmount) || 0,
      discountAmount: Number(m.discountAmount) || 0,
      balanceAmount: Number(m.balanceAmount) || 0,
      paymentMethod: m.paymentMethod ?? null,
      createdAt: m.createdAt,
    }))
  }, [invoices])

  const rowActions: DataTableRowAction<InvoiceRow>[] = useMemo(() => {
    const findInvoice = (item: InvoiceRow) => invoices.find((invoice: any) => invoice.id === item.id)

    return [
      {
        label: 'View',
        onClick: (item) => navigate({ to: '/invoices/$id', params: { id: String(item.id) } }),
      },
      {
        label: 'Print Bill',
        icon: FileText,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) previewPdf(buildInvoicePdf(invoice))
        },
      },
      {
        label: 'Print Transport Bill',
        icon: Truck,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) previewPdf(buildTransportBillPdf(invoice))
        },
      },
      {
        label: 'Print Original Bill',
        icon: ReceiptText,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) previewPdf(buildOriginalBillPdf(invoice))
        },
      },
      {
        label: 'Close Sale',
        icon: CheckCircle2,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) setCloseSaleInvoice(invoice)
        },
      },
      {
        label: 'Add Broker Commission',
        icon: Users,
        onClick: (item) => setCommissionInvoice(item),
      },
    ]
  }, [invoices, navigate])

  const bulkActions: DataTableBulkAction<InvoiceRow>[] = useMemo(
    () => [
      {
        label: 'Delete',
        icon: Trash2,
        variant: 'destructive',
        onClick: (rows) => {
          if (window.confirm(`Delete ${rows.length} invoice(s)?`)) {
            for (const row of rows) {
              deleteInvoice.mutate(row.id)
            }
          }
        },
      },
    ],
    [deleteInvoice],
  )

  const columns: ColumnDef<InvoiceRow>[] = useMemo(
    () => [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice #',
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'customerName',
        header: 'Customer',
        cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue() as string
          const opt = statusMap.get(status)
          return <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-[11px] font-medium ${optionColorClasses(opt)}`}>{opt?.label ?? status}</Badge>
        },
      },
      {
        accessorKey: 'grandTotal',
        header: 'Amount',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{(getValue() as number).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'receivedAmount',
        header: 'Received',
        cell: ({ getValue }) => (
          <span className="font-mono text-sm text-green-700">{(getValue() as number).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'discountAmount',
        header: 'Discount',
        cell: ({ getValue }) => {
          const value = getValue() as number
          return <span className={`font-mono text-sm ${value > 0 ? 'text-amber-700' : 'text-muted-foreground'}`}>{value.toFixed(2)}</span>
        },
      },
      {
        accessorKey: 'paymentMethod',
        header: 'Payment',
        cell: ({ getValue }) => <span className="text-sm">{(getValue() as string | null) ?? '—'}</span>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
    ],
    [statusMap],
  )

  return (
    <PageLayout
      title="Invoices"
      description="Manage sales invoices"
      action={
        <Button onClick={() => navigate({ to: '/invoices/create', search: { customerId: undefined, measurementId: undefined } })} className="rounded-lg shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> New Invoice
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'customerName', placeholder: 'Search invoices...' }}
        rowActions={rowActions}
        bulkActions={bulkActions}
        isLoading={isLoading}
        onRowClick={(item) => navigate({ to: '/invoices/$id', params: { id: String(item.id) } })}
        emptyState={{
          title: 'No invoices yet',
          description: 'Create your first invoice',
        }}
      />
      <CloseSaleDialog
        invoice={closeSaleInvoice}
        open={closeSaleInvoice !== null}
        onOpenChange={(open) => { if (!open) setCloseSaleInvoice(null) }}
      />
      <BrokerCommissionDialog
        invoiceId={commissionInvoice?.id ?? null}
        grandTotal={commissionInvoice?.grandTotal ?? 0}
        open={commissionInvoice !== null}
        onOpenChange={(open) => { if (!open) setCommissionInvoice(null) }}
      />
    </PageLayout>
  )
}

export { InvoicesListPage }
