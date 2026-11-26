import { useMemo, useState } from 'react'
import type { ReportInvoiceRow } from '@jg-app/shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InvoiceInsightDrawer } from '../components/insight-drawer'
import { ReportControls } from '../components/report-controls'
import { ReportEmptyRow, ReportStateCard, ReportTable } from '../components/report-table'
import { useReportFilters, useSalesReport } from '../hooks/use-reports'

type InvoiceSort = 'amount' | 'percent'

function topInvoices(rows: ReportInvoiceRow[], sort: InvoiceSort) {
  return [...rows]
    .sort((a, b) => sort === 'amount' ? b.grossProfit - a.grossProfit : b.grossMarginPct - a.grossMarginPct)
    .slice(0, 10)
}

export function TopMarginPage() {
  const { filters, updateFilters } = useReportFilters()
  const { data, isLoading, isError, refetch } = useSalesReport(filters)
  const [sort, setSort] = useState<InvoiceSort>('amount')
  const [insightInvoiceId, setInsightInvoiceId] = useState<number | null>(null)

  const invoices = useMemo(
    () => topInvoices(sort === 'amount' ? data?.topProfitInvoices ?? [] : data?.topMarginInvoices ?? [], sort),
    [data, sort],
  )
  const products = useMemo(
    () => (data?.topMarginProducts ?? []).slice(0, 10),
    [data],
  )

  const invoiceTable = (
    <ReportTable
      headers={['#', 'Invoice #', 'Date', 'Customer', 'Net Sales', 'Gross Profit', 'Profit %', 'Insight']}
      contentClassName="px-2 sm:px-4"
    >
      {invoices.length === 0 ? (
        <ReportEmptyRow colSpan={8} message="No profitable invoices in this period" />
      ) : (
        invoices.map((invoice, index) => (
          <TableRow key={invoice.id}>
            <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-mono text-xs font-medium">{invoice.invoiceNumber}</TableCell>
            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
            <TableCell className="max-w-[160px] truncate text-xs">{invoice.customerName}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatCurrency(invoice.netSales)}</TableCell>
            <TableCell className="text-right font-mono text-xs font-medium">{formatCurrency(invoice.grossProfit)}</TableCell>
            <TableCell className="text-right">
              <Badge variant={invoice.grossMarginPct < 0 ? 'destructive' : 'success'} className="rounded-full font-mono">
                {formatPercent(invoice.grossMarginPct)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => setInsightInvoiceId(invoice.id)}>
                View Insight
              </Button>
            </TableCell>
          </TableRow>
        ))
      )}
    </ReportTable>
  )

  const productTable = (
    <ReportTable
      headers={['#', 'Product', 'SKU', 'Invoices', 'Units Sold', 'Revenue', 'Gross Profit', 'Margin %']}
      contentClassName="px-2 sm:px-4"
    >
      {products.length === 0 ? (
        <ReportEmptyRow colSpan={8} message="No products sold in this period" />
      ) : (
        products.map((product, index) => (
          <TableRow key={`${product.productVariantId ?? 'none'}-${product.skuCode}`}>
            <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="max-w-[200px] truncate font-medium">{product.productName}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{product.skuCode || '—'}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatNumber(product.invoiceCount)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatNumber(product.unitsSold)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatCurrency(product.revenue)}</TableCell>
            <TableCell className="text-right font-mono text-xs">{formatCurrency(product.profit)}</TableCell>
            <TableCell className={cn('text-right font-mono text-xs', product.marginPct < 0 ? 'text-destructive' : 'text-success')}>
              {formatPercent(product.marginPct)}
            </TableCell>
          </TableRow>
        ))
      )}
    </ReportTable>
  )

  return (
    <PageLayout
      title="Top 10 High-Margin Sales"
      description="Highest profit invoices and products in the selected period"
      action={
        <ReportControls
          filters={filters}
          onFiltersChange={updateFilters}
          data={data}
          filename={`top-margin-${filters.from}-to-${filters.to}`}
        />
      }
    >
      <ReportStateCard
        isLoading={isLoading}
        isError={isError || !data}
        isEmpty={!data?.series.length}
        onRetry={() => void refetch()}
      >
        <Tabs defaultValue="invoices" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="invoices">Highest Profit Invoices</TabsTrigger>
              <TabsTrigger value="products">Highest Margin Products</TabsTrigger>
            </TabsList>
            <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-1">
              <Button
                type="button" size="sm" variant={sort === 'amount' ? 'default' : 'ghost'} className="h-7 px-3"
                aria-pressed={sort === 'amount'} onClick={() => setSort('amount')}
              >
                Profit Amount
              </Button>
              <Button
                type="button" size="sm" variant={sort === 'percent' ? 'default' : 'ghost'} className="h-7 px-3"
                aria-pressed={sort === 'percent'} onClick={() => setSort('percent')}
              >
                Profit %
              </Button>
            </div>
          </div>
          <TabsContent value="invoices">{invoiceTable}</TabsContent>
          <TabsContent value="products">{productTable}</TabsContent>
        </Tabs>
      </ReportStateCard>

      <InvoiceInsightDrawer
        invoiceId={insightInvoiceId}
        open={insightInvoiceId !== null}
        onOpenChange={(open) => { if (!open) setInsightInvoiceId(null) }}
      />
    </PageLayout>
  )
}
