import type { ReportSummary } from '@jg-app/shared'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'

type Kpi = {
  label: string
  value: string
  caption?: string
  tone?: 'positive' | 'negative' | 'neutral'
}

function kpiCards(summary: ReportSummary): Kpi[] {
  return [
    { label: 'Total Invoices', value: formatNumber(summary.invoiceCount), caption: `${formatNumber(summary.itemsSold)} items sold` },
    { label: 'Gross Sales', value: formatCurrency(summary.grossSales), caption: 'Before discounts and tax' },
    { label: 'Discounts', value: formatCurrency(summary.discounts), caption: 'Invoice + item level', tone: 'negative' },
    { label: 'Tax Collected', value: formatCurrency(summary.taxCollected) },
    { label: 'Net Sales', value: formatCurrency(summary.netSales), caption: 'Billed less discounts & tax' },
    { label: 'COGS', value: formatCurrency(summary.cogs), caption: 'Cost of goods sold', tone: 'negative' },
    { label: 'Gross Profit', value: formatCurrency(summary.grossProfit), tone: summary.grossProfit >= 0 ? 'positive' : 'negative' },
    { label: 'Gross Margin %', value: formatPercent(summary.grossMarginPct), tone: summary.grossMarginPct >= 0 ? 'positive' : 'negative' },
    { label: 'Net Profit', value: formatCurrency(summary.netProfit), tone: summary.netProfit >= 0 ? 'positive' : 'negative' },
    { label: 'Net Margin %', value: formatPercent(summary.netMarginPct), tone: summary.netMarginPct >= 0 ? 'positive' : 'negative' },
    { label: 'AOV', value: formatCurrency(summary.aov), caption: 'Average invoice value' },
  ]
}

export function ReportKpis({ summary, className }: { summary: ReportSummary; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpiCards(summary).map((kpi) => (
          <Card key={kpi.label} className="min-w-0">
            <CardContent className="flex flex-col gap-1 p-4">
              <p className="truncate text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <p
                className={cn(
                  'truncate text-lg font-semibold tracking-tight',
                  kpi.tone === 'positive' && 'text-success',
                  kpi.tone === 'negative' && 'text-destructive',
                )}
              >
                {kpi.value}
              </p>
              {kpi.caption && <p className="truncate text-[11px] text-muted-foreground">{kpi.caption}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p>
          Cost coverage: <span className="font-medium text-foreground">{formatPercent(summary.costCoveragePct)}</span> of sale lines have a resolved unit cost.
        </p>
        <p>Net Profit = Gross Profit − Operating Expenses ({formatCurrency(summary.operatingExpenses)}).</p>
      </div>
    </div>
  )
}
