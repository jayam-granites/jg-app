import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Download, FileText, Plus, ReceiptText, Sparkles, Trash2, Truck, Users, Wallet } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/shared/components/data-table'
import type { DataTableRowAction, DataTableBulkAction } from '@/shared/components/data-table'
import { PageLayout } from '@/shared/components/page-layout'
import { useInvoices, useDeleteInvoice } from '@/features/invoices/hooks/use-invoices'
import { useLookupOptions, lookupOptionMap, optionColorClasses } from '@/features/masters/hooks/use-lookups'
import { LOOKUP_GROUPS } from '@jg-app/shared'
import { formatDate } from '@/lib/date'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { previewPdf } from '@/lib/pdf'
import { buildInvoicePdf, buildOriginalBillPdf, buildTransportBillPdf, downloadInvoicePdf } from '../lib/invoice-pdf'
import { CloseSaleDialog } from '../components/close-sale-dialog'
import { BrokerCommissionDialog } from '../components/broker-commission-dialog'
import { RecordInvoicePaymentDialog } from '../components/record-invoice-payment-dialog'
import { InvoiceInsightDrawer } from '@/features/reports/components/insight-drawer'
import { useAuth } from '@/providers/auth'

type InvoiceRow = {
  id: number
  invoiceNumber: string
  invoiceType: string
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
  const { hasPermission } = useAuth()
  const canViewInsights = hasPermission('reports:read')
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState<'all' | 'gst' | 'normal'>('all')
  const { data: invoicesRes, isLoading } = useInvoices(
    invoiceTypeFilter === 'all' ? undefined : invoiceTypeFilter,
  )
  const { data: statusOptionsRes } = useLookupOptions(LOOKUP_GROUPS.INVOICE_STATUS)
  const deleteInvoice = useDeleteInvoice()
  const [closeSaleInvoice, setCloseSaleInvoice] = useState<any | null>(null)
  const [commissionInvoice, setCommissionInvoice] = useState<InvoiceRow | null>(null)
  const [paymentInvoice, setPaymentInvoice] = useState<any | null>(null)
  const [insightInvoiceId, setInsightInvoiceId] = useState<number | null>(null)

  const invoices = invoicesRes?.data ?? []
  const statusMap = useMemo(
    () => lookupOptionMap(statusOptionsRes?.data?.[LOOKUP_GROUPS.INVOICE_STATUS] ?? []),
    [statusOptionsRes],
  )

  const tableData: InvoiceRow[] = useMemo(() => {
    return invoices.map((m: any) => ({
      id: m.id,
      invoiceNumber: m.invoiceNumber,
      invoiceType: m.invoiceType ?? (m.isGst ? 'gst' : 'normal'),
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
    const insightActions: DataTableRowAction<InvoiceRow>[] = canViewInsights
      ? [
          {
            label: 'View Insight',
            icon: Sparkles,
            onClick: (item) => setInsightInvoiceId(item.id),
          },
        ]
      : []

    return [
      {
        label: 'View',
        onClick: (item) => navigate({ to: '/invoices/$id', params: { id: String(item.id) } }),
      },
      ...insightActions,
      {
        label: 'Record Payment',
        icon: Wallet,
        disabled: (item) => item.balanceAmount <= 0.001,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) setPaymentInvoice(invoice)
        },
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
        label: 'Download Tax Invoice',
        icon: Download,
        onClick: (item) => {
          const invoice = findInvoice(item)
          if (invoice) {
            void downloadInvoicePdf(invoice).catch((error: unknown) => {
              window.alert(error instanceof Error ? error.message : 'Failed to download invoice PDF')
            })
          }
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
        disabled: (item) => item.status === 'PAID',
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
  }, [invoices, navigate, canViewInsights])

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

  const columns: ColumnDef<InvoiceRow>[] = useMemo(() => {
    return [
      {
        accessorKey: 'invoiceNumber',
        header: 'Invoice #',
        cell: ({ getValue }) => <span className="font-mono text-sm font-medium">{getValue() as string}</span>,
      },
      {
        accessorKey: 'invoiceType',
        header: 'Type',
        cell: ({ getValue }) => {
          const type = getValue() as string
          return (
            <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${type === 'gst' ? 'bg-info/12 text-info' : 'bg-muted text-muted-foreground'}`}>
              {type === 'gst' ? 'GST' : 'Normal'}
            </Badge>
          )
        },
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
          return <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ${optionColorClasses(opt)}`}>{opt?.label ?? status}</Badge>
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
          <span className="font-mono text-sm text-success">{(getValue() as number).toFixed(2)}</span>
        ),
      },
      {
        accessorKey: 'discountAmount',
        header: 'Discount',
        cell: ({ getValue }) => {
          const value = getValue() as number
          return <span className={`font-mono text-sm ${value > 0 ? 'text-warning' : 'text-muted-foreground'}`}>{value.toFixed(2)}</span>
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
            {formatDate(getValue() as string)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableHiding: false,
        cell: () => null,
      },
    ]
  }, [statusMap])

  return (
    <PageLayout
      title="Invoices"
      description="Manage sales invoices"
      action={
        <Button onClick={() => navigate({ to: '/invoices/create', search: { customerId: undefined, measurementId: undefined } })} className="rounded-lg shadow-xs">
          <Plus className="mr-2 size-4" /> New Invoice
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={tableData}
        searchKey={{ id: 'customerName', placeholder: 'Search invoices...' }}
        toolbarChildren={
          <Select
            value={invoiceTypeFilter}
            onValueChange={(value) => setInvoiceTypeFilter(value as 'all' | 'gst' | 'normal')}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs" aria-label="Filter by invoice type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="gst">GST Only</SelectItem>
              <SelectItem value="normal">Normal Only</SelectItem>
            </SelectContent>
          </Select>
        }
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
      <RecordInvoicePaymentDialog
        invoice={paymentInvoice}
        open={paymentInvoice !== null}
        onOpenChange={(open) => { if (!open) setPaymentInvoice(null) }}
      />
      <InvoiceInsightDrawer
        invoiceId={insightInvoiceId}
        open={insightInvoiceId !== null}
        onOpenChange={(open) => { if (!open) setInsightInvoiceId(null) }}
      />
    </PageLayout>
  )
}

export { InvoicesListPage }
