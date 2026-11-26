import type { ReportInsight, ReportTone } from '@jg-app/shared'
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  CheckCircle2,
  Lightbulb,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ReportControls } from '../components/report-controls'
import { ReportKpis } from '../components/report-kpis'
import { ReportEmptyRow, ReportStateCard, ReportTable } from '../components/report-table'
import { RevenueProfitChart } from '../components/revenue-profit-chart'
import { useReportFilters, useSalesReport } from '../hooks/use-reports'

type PnlStep = { label: string; value: number; kind: 'total' | 'subtotal' | 'deduction'; note?: string }

const TONE_ICON: Record<ReportTone, LucideIcon> = {
  positive: CheckCircle2,
  negative: AlertTriangle,
  warning: AlertTriangle,
  neutral: Lightbulb,
}

const TONE_TEXT: Record<ReportTone, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-primary',
}

function PnlWaterfall({ steps }: { steps: PnlStep[] }) {
  const max = Math.max(1, ...steps.map((step) => Math.abs(step.value)))
  return (
    <Card>
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Profit & Loss Waterfall</CardTitle>
        <CardDescription>From gross revenue to net profit for the selected range</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-stretch gap-2 p-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex min-w-[130px] flex-1 flex-col gap-2 rounded-lg border p-3',
                step.kind === 'total' && step.value >= 0 && 'border-success/30 bg-success/12',
                step.kind === 'deduction' && 'border-border bg-muted/30',
              )}
            >
              <p className="text-xs font-medium text-muted-foreground">{step.label}</p>
              <p
                className={cn(
                  'font-mono text-base font-semibold',
                  step.kind === 'deduction' && 'text-destructive',
                  step.kind === 'total' && step.value >= 0 && 'text-success',
                )}
              >
                {step.value < 0 ? '− ' : ''}{formatCurrency(Math.abs(step.value))}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', step.kind === 'deduction' ? 'bg-destructive' : 'bg-success')}
                  style={{ width: `${Math.max((Math.abs(step.value) / max) * 100, 2)}%` }}
                />
              </div>
              {step.note && <p className="text-[11px] text-muted-foreground">{step.note}</p>}
            </div>
            {index < steps.length - 1 && <ArrowRight className="size-4 shrink-0 text-muted-foreground" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function InsightStrip({ insights }: { insights: ReportInsight[] }) {
  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Lightbulb className="size-4" /> No notable insights for this period.
      </div>
    )
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {insights.slice(0, 4).map((insight, index) => {
        const Icon = TONE_ICON[insight.tone] ?? Lightbulb
        return (
          <div key={`${insight.title}-${index}`} className="flex items-start gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-xs">
            <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_TEXT[insight.tone] ?? 'text-primary')} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{insight.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function OverviewPage() {
  const { filters, updateFilters } = useReportFilters()
  const { data, isLoading, isError, refetch } = useSalesReport(filters)

  const steps: PnlStep[] = data ? [
    { label: 'Gross Revenue', value: data.summary.grandTotal, kind: 'total', note: `${formatNumber(data.summary.invoiceCount)} invoices` },
    { label: 'Discounts, Tax & Adjustments', value: -(data.summary.grandTotal - data.summary.netSales), kind: 'deduction' },
    { label: 'Net Revenue', value: data.summary.netSales, kind: 'subtotal' },
    { label: 'COGS', value: -data.summary.cogs, kind: 'deduction' },
    { label: 'Gross Profit', value: data.summary.grossProfit, kind: 'subtotal' },
    { label: 'Operating Expenses', value: -data.summary.operatingExpenses, kind: 'deduction' },
    { label: 'Net Profit', value: data.summary.netProfit, kind: 'total', note: formatPercent(data.summary.netMarginPct) },
  ] : []

  return (
    <PageLayout
      title="Sales & Profit Overview"
      description="Executive view of revenue, profitability and discount impact"
      action={
        <ReportControls
          filters={filters}
          onFiltersChange={updateFilters}
          data={data}
          filename={`sales-overview-${filters.from}-to-${filters.to}`}
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
            <PnlWaterfall steps={steps} />
            <ReportKpis summary={data.summary} />
            <InsightStrip insights={data.insights} />
            <RevenueProfitChart data={data.series} />

            <div className="grid gap-4 xl:grid-cols-2">
              <ReportTable
                title="Customer Profitability"
                description="Highest-value customers in the selected period"
                headers={['Customer', 'Orders', 'Total Spend', 'AOV', 'Profit', 'Margin %', 'LTV', 'Last Purchase']}
                contentClassName="px-2 sm:px-4"
              >
                {data.topCustomers.length === 0 ? (
                  <ReportEmptyRow colSpan={8} message="No customer data in this period" />
                ) : (
                  data.topCustomers.map((customer) => (
                    <TableRow key={customer.customerId}>
                      <TableCell className="max-w-[140px] truncate font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right font-mono">{formatNumber(customer.orderCount)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(customer.totalSpend)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(customer.aov)}</TableCell>
                      <TableCell className={cn('text-right font-mono', customer.profit < 0 ? 'text-destructive' : 'text-success')}>
                        {formatCurrency(customer.profit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">{formatPercent(customer.avgMarginPct)}</TableCell>
                      <TableCell className="text-right font-mono">{formatCurrency(customer.ltv)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                        {formatDate(customer.lastPurchaseDate)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </ReportTable>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card>
                    <CardContent className="flex flex-col gap-1 p-4">
                      <p className="text-xs text-muted-foreground">Total Discounts</p>
                      <p className="font-mono text-lg font-semibold text-warning">{formatCurrency(data.discountImpact.totalDiscounts)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex flex-col gap-1 p-4">
                      <p className="text-xs text-muted-foreground">Item Discounts</p>
                      <p className="font-mono text-lg font-semibold text-warning">{formatCurrency(data.discountImpact.itemDiscounts)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex flex-col gap-1 p-4">
                      <p className="text-xs text-muted-foreground">Loss-Making Invoices</p>
                      <p className="font-mono text-lg font-semibold text-destructive">{formatNumber(data.discountImpact.invoicesWithLoss)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex flex-col gap-1 p-4">
                      <p className="text-xs text-muted-foreground">Profit Erosion</p>
                      <p className="font-mono text-lg font-semibold text-destructive">{formatCurrency(data.discountImpact.discountErosion)}</p>
                    </CardContent>
                  </Card>
                </div>

                <ReportTable
                  title="Discount Impact"
                  description="Invoices with the largest discounts"
                  headers={['Invoice #', 'Date', 'Customer', 'Discount', 'Margin %']}
                  contentClassName="px-2 sm:px-4"
                >
                  {data.discountImpact.topDiscountedInvoices.length === 0 ? (
                    <ReportEmptyRow colSpan={5} message="No discounted invoices in this period" />
                  ) : (
                    data.discountImpact.topDiscountedInvoices.map((invoice) => (
                      <TableRow key={invoice.invoiceId}>
                        <TableCell className="font-mono text-xs font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs">{invoice.customerName}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-warning">{formatCurrency(invoice.discounts)}</TableCell>
                        <TableCell className={cn('text-right font-mono text-xs', invoice.grossMarginPct < 0 ? 'text-destructive' : 'text-success')}>
                          {formatPercent(invoice.grossMarginPct)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </ReportTable>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <BadgeIndianRupee className="size-4 text-warning" />
                  <span>
                    Estimated gross profit without discounts:{' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(data.discountImpact.estimatedGrossProfitWithoutDiscount)}
                    </span>
                  </span>
                  <TrendingUp className="size-4 text-success" />
                  <span>After discounts: <span className="font-medium text-foreground">{formatCurrency(data.discountImpact.grossProfitAfterDiscount)}</span></span>
                  <TrendingDown className="size-4 text-destructive" />
                  <span>{formatNumber(data.discountImpact.discountedInvoiceCount)} discounted invoices</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ReportStateCard>
    </PageLayout>
  )
}
