import { useMemo, useState } from 'react'
import type { ReportInvoiceRow, ReportPeriodRow, SalesReportData } from '@jg-app/shared'
import { ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { InvoiceInsightDrawer } from '../components/insight-drawer'
import { ReportControls } from '../components/report-controls'
import { ReportKpis } from '../components/report-kpis'
import { ReportEmptyRow, ReportStateCard, ReportTable } from '../components/report-table'
import { RevenueProfitChart } from '../components/revenue-profit-chart'
import { useReportFilters, useSalesReport } from '../hooks/use-reports'

function invoicesForPeriod(data: SalesReportData, period: ReportPeriodRow): ReportInvoiceRow[] {
  const from = period.periodStart.slice(0, 10)
  const to = period.periodEnd.slice(0, 10)
  const matches = data.invoices.filter((invoice) => {
    const date = invoice.localDate
    return date >= from && date <= to
  })
  return matches.length > 0 ? matches : data.invoices
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className="rounded-full text-xs">
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}

export function SalesReportPage() {
  const { filters, updateFilters } = useReportFilters()
  const { data, isLoading, isError, refetch } = useSalesReport(filters)
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriodRow | null>(null)
  const [insightInvoiceId, setInsightInvoiceId] = useState<number | null>(null)

  const periodInvoices = useMemo(
    () => (data && selectedPeriod ? invoicesForPeriod(data, selectedPeriod) : []),
    [data, selectedPeriod],
  )

  return (
    <PageLayout
      title="Sales Summary"
      description="Revenue, costs and profitability across the selected period"
      action={
        <ReportControls
          filters={filters}
          onFiltersChange={updateFilters}
          data={data}
          filename={`sales-summary-${filters.from}-to-${filters.to}`}
        />
      }
    >
      <ReportStateCard
        isLoading={isLoading}
        isError={isError || !data}
        isEmpty={!data?.series.length}
        onRetry={() => void refetch()}
      >
        {data && (
          <div className="flex flex-col gap-4">
            <ReportKpis summary={data.summary} />
            <RevenueProfitChart data={data.series} />

            <ReportTable
              title="Period Breakdown"
              description="Click a period to drill into its invoices"
              headers={['Period', 'Invoices', 'Items Sold', 'Net Sales', 'COGS', 'Gross Profit', 'Profit %', 'AOV', 'Net Profit']}
            >
              {data.series.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setSelectedPeriod(row)}
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                    >
                      {row.label} <ArrowUpRight className="size-3" />
                    </button>
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(row.invoiceCount)}</TableCell>
                  <TableCell className="text-right font-mono">{formatNumber(row.itemsSold)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.netSales)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(row.cogs)}</TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.grossProfit)}</TableCell>
                  <TableCell className={cn('text-right font-mono', row.grossMarginPct < 0 ? 'text-destructive' : 'text-success')}>
                    {formatPercent(row.grossMarginPct)}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(row.aov)}</TableCell>
                  <TableCell className={cn('text-right font-mono', row.netProfit < 0 ? 'text-destructive' : 'text-success')}>
                    {formatCurrency(row.netProfit)}
                  </TableCell>
                </TableRow>
              ))}
            </ReportTable>
          </div>
        )}
      </ReportStateCard>

      <Sheet open={selectedPeriod !== null} onOpenChange={(open) => { if (!open) setSelectedPeriod(null) }}>
        <SheetContent side="right" className="sm:max-w-2xl">
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>{selectedPeriod?.label ?? 'Period'} Invoices</SheetTitle>
            <SheetDescription>
              {selectedPeriod ? `${formatDate(selectedPeriod.periodStart)} – ${formatDate(selectedPeriod.periodEnd)}` : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <ReportTable
              headers={['Invoice #', 'Date', 'Customer', 'Status', 'Net Sales', 'Gross Profit', 'Margin %', 'Insight']}
              contentClassName="px-2 sm:px-4"
            >
              {periodInvoices.length === 0 ? (
                <ReportEmptyRow colSpan={8} message="No invoices in this bucket" />
              ) : (
                periodInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs font-medium">{invoice.invoiceNumber}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{invoice.customerName}</TableCell>
                    <TableCell><StatusBadge status={invoice.status} /></TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(invoice.netSales)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCurrency(invoice.grossProfit)}</TableCell>
                    <TableCell className={cn('text-right font-mono text-xs', invoice.grossMarginPct < 0 ? 'text-destructive' : 'text-success')}>
                      {formatPercent(invoice.grossMarginPct)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => setInsightInvoiceId(invoice.id)}
                      >
                        View Insight
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </ReportTable>
            {selectedPeriod && periodInvoices.length === data?.invoices.length && periodInvoices.length > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                No exact date matches for this bucket — showing all invoices in the selected range.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <InvoiceInsightDrawer
        invoiceId={insightInvoiceId}
        open={insightInvoiceId !== null}
        onOpenChange={(open) => { if (!open) setInsightInvoiceId(null) }}
      />
    </PageLayout>
  )
}
