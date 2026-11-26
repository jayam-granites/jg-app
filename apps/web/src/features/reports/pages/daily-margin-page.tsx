import { useMemo } from 'react'
import type { ReportDailyMarginRow, ReportTone } from '@jg-app/shared'
import { ArrowDownRight, ArrowUpRight, Inbox, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TableCell, TableRow } from '@/components/ui/table'
import { PageLayout } from '@/shared/components/page-layout'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ReportControls } from '../components/report-controls'
import { ReportStateCard, ReportTable } from '../components/report-table'
import { useReportFilters, useSalesReport } from '../hooks/use-reports'

const TONE_TEXT: Record<ReportTone, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-muted-foreground',
}

const TONE_BADGE: Record<ReportTone, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  positive: 'success',
  negative: 'destructive',
  warning: 'warning',
  neutral: 'secondary',
}

function MarginTrendChart({ data }: { data: ReportDailyMarginRow[] }) {
  const chart = useMemo(() => {
    const WIDTH = 960
    const HEIGHT = 220
    const PAD = { left: 64, right: 16, top: 16, bottom: 40 }
    const plotWidth = WIDTH - PAD.left - PAD.right
    const plotHeight = HEIGHT - PAD.top - PAD.bottom
    const values = data.map((row) => row.profitPct)
    const min = Math.min(0, ...values)
    const max = Math.max(0, ...values)
    const range = max - min || 1
    const step = data.length > 1 ? plotWidth / (data.length - 1) : 0
    const x = (index: number) => PAD.left + (data.length === 1 ? plotWidth / 2 : index * step)
    const y = (value: number) => PAD.top + plotHeight - ((value - min) / range) * plotHeight
    return { WIDTH, HEIGHT, PAD, plotWidth, min, max, x, y }
  }, [data])

  return (
    <Card>
      <CardHeader className="border-b py-4">
        <CardTitle className="text-base">Daily Margin Trend</CardTitle>
        <CardDescription>Gross profit percentage day by day</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {data.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Inbox className="size-8 text-muted-foreground/50" /> No daily margin data in this range
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${chart.WIDTH} ${chart.HEIGHT}`}
            className="h-auto w-full"
            role="img"
            aria-label={`Line chart of daily gross margin across ${formatNumber(data.length)} days`}
          >
            {[chart.max, 0, chart.min].map((value, index) => (
              <g key={index}>
                <line
                  x1={chart.PAD.left} x2={chart.WIDTH - chart.PAD.right}
                  y1={chart.y(value)} y2={chart.y(value)}
                  stroke="var(--border)" strokeWidth={1}
                  strokeDasharray={value === 0 ? undefined : '4 4'}
                />
                <text x={chart.PAD.left - 8} y={chart.y(value) + 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                  {formatPercent(value, 0)}
                </text>
              </g>
            ))}
            <polyline
              points={data.map((row, index) => `${chart.x(index)},${chart.y(row.profitPct)}`).join(' ')}
              fill="none" stroke="var(--chart-2)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round"
            />
            {data.map((row, index) => (
              <circle key={row.date} cx={chart.x(index)} cy={chart.y(row.profitPct)} r={4} fill="var(--chart-2)">
                <title>{`${row.label}: ${formatPercent(row.profitPct)} margin on ${formatCurrency(row.netRevenue)}`}</title>
              </circle>
            ))}
            {data.map((row, index) =>
              index % Math.max(1, Math.ceil(data.length / 12)) === 0 || index === data.length - 1 ? (
                <text
                  key={`label-${row.date}`}
                  x={chart.x(index)} y={chart.HEIGHT - chart.PAD.bottom + 20}
                  textAnchor="middle" className="fill-muted-foreground text-[10px]"
                >
                  {formatDate(row.date)}
                </text>
              ) : null,
            )}
          </svg>
        )}
      </CardContent>
    </Card>
  )
}

export function DailyMarginPage() {
  const { filters, updateFilters } = useReportFilters({ granularity: 'daily' })
  const { data, isLoading, isError, refetch } = useSalesReport(filters)

  return (
    <PageLayout
      title="Daily Margin & Profit %"
      description="Day-by-day margin performance and shifts"
      action={
        <ReportControls
          filters={filters}
          onFiltersChange={updateFilters}
          data={data}
          filename={`daily-margin-${filters.from}-to-${filters.to}`}
        />
      }
    >
      <ReportStateCard
        isLoading={isLoading}
        isError={isError || !data}
        isEmpty={!data?.dailyMargins.length}
        onRetry={() => void refetch()}
      >
        {data && (
          <div className="flex flex-col gap-4">
            <MarginTrendChart data={data.dailyMargins} />
            <ReportTable
              title="Daily Margins"
              description="Low or negative margin days are highlighted"
              headers={['Date', 'Total Invoices', 'Net Revenue', 'Total COGS', 'Gross Profit', 'Profit %', 'Best Margin Invoice #', 'Day-over-Day Change %']}
            >
              {data.dailyMargins.map((row) => {
                const ChangeIcon = row.marginChangePct > 0 ? ArrowUpRight : row.marginChangePct < 0 ? ArrowDownRight : Minus
                return (
                  <TableRow
                    key={row.date}
                    className={cn(
                      row.tone === 'negative' && 'bg-destructive/5',
                      row.tone === 'warning' && 'bg-warning/12',
                    )}
                  >
                    <TableCell className="whitespace-nowrap font-medium">{formatDate(row.date)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(row.invoiceCount)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.netRevenue)}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatCurrency(row.cogs)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.grossProfit)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={TONE_BADGE[row.tone]} className="rounded-full font-mono">
                        {formatPercent(row.profitPct)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.bestMarginInvoiceNumber ? (
                        <span className="font-mono text-xs">
                          {row.bestMarginInvoiceNumber}
                          <span className={cn('ml-1 text-xs', TONE_TEXT[row.tone])}>({formatPercent(row.bestMarginPct)})</span>
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className={cn('text-right font-mono', TONE_TEXT[row.tone])}>
                      <span className="inline-flex items-center justify-end gap-1">
                        <ChangeIcon className="size-3.5" />
                        {formatPercent(row.marginChangePct)}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </ReportTable>
          </div>
        )}
      </ReportStateCard>
    </PageLayout>
  )
}
