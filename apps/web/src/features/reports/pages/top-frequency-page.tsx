import { useMemo, type ReactNode } from 'react'
import type { ReportActivityRow } from '@jg-app/shared'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ReportControls } from '../components/report-controls'
import { ReportEmptyRow, ReportStateCard, ReportTable } from '../components/report-table'
import { useReportFilters, useSalesReport } from '../hooks/use-reports'

const BAR_CLASSES = ['bg-primary', 'bg-success', 'bg-info', 'bg-warning']

function ActivityBars({ rows, label }: { rows: ReportActivityRow[]; label: string }) {
  const max = Math.max(1, ...rows.map((row) => row.netSales))
  return (
    <ReportTable title={label} description="Net sales by activity bucket" headers={['Bucket', 'Net Sales', 'Share']} contentClassName="p-4">
      <ReportEmptyRowWrapper rows={rows} colSpan={3}>
        {rows.map((row, index) => (
          <TableRow key={row.label}>
            <TableCell className="w-40 font-medium">{row.label}</TableCell>
            <TableCell>
              <div className="flex flex-col gap-1">
                <span className="font-mono text-xs">{formatCurrency(row.netSales)} · {formatNumber(row.invoiceCount)} invoices</span>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full transition-all', BAR_CLASSES[index % BAR_CLASSES.length])}
                    style={{ width: `${Math.max((row.netSales / max) * 100, 2)}%` }}
                  />
                </div>
              </div>
            </TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">
              {formatPercent(max > 0 ? (row.netSales / max) * 100 : 0, 0)}
            </TableCell>
          </TableRow>
        ))}
      </ReportEmptyRowWrapper>
    </ReportTable>
  )
}

function ReportEmptyRowWrapper({ rows, colSpan, children }: { rows: unknown[]; colSpan: number; children: ReactNode }) {
  return rows.length === 0 ? <ReportEmptyRow colSpan={colSpan} /> : <>{children}</>
}

export function TopFrequencyPage() {
  const { filters, updateFilters } = useReportFilters()
  const { data, isLoading, isError, refetch } = useSalesReport(filters)

  const products = useMemo(
    () => (data?.topFrequencyProducts ?? []).slice(0, 10),
    [data],
  )
  const customers = useMemo(
    () => (data?.frequentCustomers ?? []).slice(0, 10),
    [data],
  )

  return (
    <PageLayout
      title="Top 10 High-Frequency Sales"
      description="Products, customers and peak activity in the selected period"
      action={
        <ReportControls
          filters={filters}
          onFiltersChange={updateFilters}
          data={data}
          filename={`top-frequency-${filters.from}-to-${filters.to}`}
        />
      }
    >
      <ReportStateCard
        isLoading={isLoading}
        isError={isError || !data}
        isEmpty={!data?.series.length}
        onRetry={() => void refetch()}
      >
        <Tabs defaultValue="products" className="flex flex-col gap-4">
          <TabsList>
            <TabsTrigger value="products">Frequently Sold Products</TabsTrigger>
            <TabsTrigger value="customers">High-Frequency Customers</TabsTrigger>
            <TabsTrigger value="activity">Peak Hours & Days</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ReportTable
              headers={['#', 'Product', 'SKU', 'Invoice Occurrences', 'Units Sold', 'Revenue', 'Profit %']}
              contentClassName="px-2 sm:px-4"
            >
              {products.length === 0 ? (
                <ReportEmptyRow colSpan={7} message="No products sold in this period" />
              ) : (
                products.map((product, index) => (
                  <TableRow key={`${product.productVariantId ?? 'none'}-${product.skuCode}`}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{product.productName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{product.skuCode || '—'}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(product.invoiceCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(product.unitsSold)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(product.revenue)}</TableCell>
                    <TableCell className={cn('text-right font-mono', product.marginPct < 0 ? 'text-destructive' : 'text-success')}>
                      {formatPercent(product.marginPct)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </ReportTable>
          </TabsContent>

          <TabsContent value="customers">
            <ReportTable
              headers={['#', 'Customer', 'Orders', 'Total Spend', 'AOV', 'Total Profit', 'LTV', 'Last Purchase']}
              contentClassName="px-2 sm:px-4"
            >
              {customers.length === 0 ? (
                <ReportEmptyRow colSpan={8} message="No customer activity in this period" />
              ) : (
                customers.map((customer, index) => (
                  <TableRow key={customer.customerId}>
                    <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium">{customer.name}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(customer.orderCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(customer.totalSpend)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(customer.aov)}</TableCell>
                    <TableCell className={cn('text-right font-mono', customer.profit < 0 ? 'text-destructive' : 'text-success')}>
                      {formatCurrency(customer.profit)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(customer.ltv)}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {formatDate(customer.lastPurchaseDate)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </ReportTable>
          </TabsContent>

          <TabsContent value="activity" className="grid gap-4 lg:grid-cols-2">
            <ActivityBars rows={data?.peakHours ?? []} label="Peak Sales Hours" />
            <ActivityBars rows={data?.peakWeekdays ?? []} label="Peak Days of Week" />
          </TabsContent>
        </Tabs>
      </ReportStateCard>
    </PageLayout>
  )
}
