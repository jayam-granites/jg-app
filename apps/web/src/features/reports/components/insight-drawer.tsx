import type { ReportInsight, ReportLineItem, ReportTone } from '@jg-app/shared'
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/date'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useInvoiceInsight } from '../hooks/use-reports'

const STATUS_CLASSES: Record<string, string> = {
  PAID: 'bg-success/12 text-success',
  PARTIAL_PAID: 'bg-warning/12 text-warning',
  PENDING: 'bg-info/12 text-info',
  DRAFT: 'bg-muted text-muted-foreground',
  CANCELLED: 'bg-destructive/10 text-destructive',
}

const TONE_ICON: Record<ReportTone, LucideIcon> = {
  positive: CheckCircle2,
  negative: AlertTriangle,
  warning: AlertTriangle,
  neutral: Lightbulb,
}

const TONE_CLASSES: Record<ReportTone, string> = {
  positive: 'text-success',
  negative: 'text-destructive',
  warning: 'text-warning',
  neutral: 'text-primary',
}

const TONE_BADGE: Record<ReportTone, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  positive: 'success',
  negative: 'destructive',
  warning: 'warning',
  neutral: 'secondary',
}

function BreakdownRow({ label, value, negative, strong }: { label: string; value: string; negative?: boolean; strong?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm', strong && 'font-semibold')}>
      <span className={negative ? 'text-muted-foreground' : undefined}>{label}</span>
      <span className={cn('font-mono tabular-nums', negative && 'text-destructive', strong && 'text-base')}>{value}</span>
    </div>
  )
}

function InsightCallout({ insight }: { insight: ReportInsight }) {
  const Icon = TONE_ICON[insight.tone] ?? Lightbulb
  return (
    <Alert
      variant={insight.tone === 'negative' ? 'destructive' : 'default'}
      className={cn(insight.tone === 'positive' && 'border-success/30 bg-success/10', insight.tone === 'warning' && 'border-warning/30 bg-warning/12')}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('mt-0.5 size-4 shrink-0', TONE_CLASSES[insight.tone] ?? 'text-primary')} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTitle>{insight.title}</AlertTitle>
            <Badge variant={TONE_BADGE[insight.tone] ?? 'secondary'} className="rounded-full">
              {insight.tone}
            </Badge>
          </div>
          <AlertDescription className="text-muted-foreground">{insight.description}</AlertDescription>
        </div>
      </div>
    </Alert>
  )
}

function LineItemsTable({ lines }: { lines: ReportLineItem[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Selling Price</TableHead>
            <TableHead className="text-right">Unit Cost Price</TableHead>
            <TableHead className="text-right">Line Total</TableHead>
            <TableHead className="text-right">Line Profit</TableHead>
            <TableHead className="text-right">Item Margin %</TableHead>
            <TableHead className="text-right">Profit Contribution %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                No line items recorded for this invoice
              </TableCell>
            </TableRow>
          ) : (
            lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{line.productName}</span>
                    <span className="text-xs text-muted-foreground">{line.description}{line.skuCode ? ` · ${line.skuCode}` : ''}</span>
                    {line.belowCost && (
                      <Badge variant="destructive" className="w-fit rounded-full">Below cost</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{formatNumber(line.qty)}</TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(line.unitSellingPrice)}</TableCell>
                <TableCell className={cn('text-right font-mono', line.unitCostPrice == null && 'text-muted-foreground')}>
                  {line.unitCostPrice == null ? 'Not tracked' : formatCurrency(line.unitCostPrice)}
                </TableCell>
                <TableCell className="text-right font-mono">{formatCurrency(line.lineTotal)}</TableCell>
                <TableCell className={cn('text-right font-mono', line.lineProfit < 0 ? 'text-destructive' : 'text-success')}>
                  {formatCurrency(line.lineProfit)}
                </TableCell>
                <TableCell className={cn('text-right font-mono', line.itemMarginPct < 0 && 'text-destructive')}>
                  {formatPercent(line.itemMarginPct)}
                </TableCell>
                <TableCell className="text-right font-mono">{formatPercent(line.profitContributionPct)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

export function InvoiceInsightDrawer({
  invoiceId,
  open,
  onOpenChange,
}: {
  invoiceId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data, isLoading, isError, refetch } = useInvoiceInsight(invoiceId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-2xl">
        <SheetHeader className="pr-8 text-left">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" /> Invoice Insight
          </SheetTitle>
          <SheetDescription>Profitability breakdown and smart observations</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex flex-col gap-4 py-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
          </div>
        ) : isError || !data ? (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <AlertTriangle className="size-8 text-warning" />
              <div>
                <p className="font-medium">Could not load invoice insight</p>
                <p className="text-sm text-muted-foreground">Check the connection and try again.</p>
              </div>
              <Button variant="outline" onClick={() => void refetch()}>Retry</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-4 py-4">
            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-semibold">{data.invoice.invoiceNumber}</span>
                    <Badge className={cn('rounded-full border-0', STATUS_CLASSES[data.invoice.status] ?? 'bg-muted text-muted-foreground')}>
                      {data.invoice.status.replaceAll('_', ' ')}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{formatDate(data.invoice.invoiceDate)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Customer</p>
                    <p className="font-medium">{data.invoice.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mobile</p>
                    <p className="font-medium">{data.invoice.customerMobile ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment method</p>
                    <p className="font-medium">{data.invoice.paymentMethod ?? '—'}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Cashier not tracked for this invoice.</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-2 p-4">
                <p className="text-sm font-semibold">Financial breakdown</p>
                <Separator />
                <BreakdownRow label="Subtotal" value={formatCurrency(data.summary.subtotal)} />
                <BreakdownRow label="Discount Given" value={formatCurrency(data.summary.discount)} negative={data.summary.discount > 0} />
                <BreakdownRow label="Item Discounts" value={formatCurrency(data.summary.itemDiscounts)} negative={data.summary.itemDiscounts > 0} />
                <BreakdownRow label="Tax" value={formatCurrency(data.summary.tax)} />
                <BreakdownRow label="Grand Total" value={formatCurrency(data.summary.grandTotal)} strong />
                <Separator />
                <BreakdownRow label="Total COGS" value={formatCurrency(data.summary.cogs)} negative />
                <BreakdownRow
                  label="Net Gross Profit"
                  value={formatCurrency(data.summary.netGrossProfit)}
                  negative={data.summary.netGrossProfit < 0}
                  strong
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>Profit Margin %</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-mono font-semibold', data.summary.profitMarginPct < 0 ? 'text-destructive' : 'text-success')}>
                      {formatPercent(data.summary.profitMarginPct)}
                    </span>
                    <Badge
                      variant={data.comparison === 'above' ? 'success' : data.comparison === 'below' ? 'destructive' : 'secondary'}
                      className="rounded-full"
                    >
                      {data.comparison === 'above' ? 'Above Average' : data.comparison === 'below' ? 'Below Average' : 'At Average'}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Store average margin: {formatPercent(data.storeAverageMarginPct)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Cost basis: {data.costBasis.method} · {formatNumber(data.costBasis.linesWithCost)}/{formatNumber(data.costBasis.totalLines)} lines with cost
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Line items</p>
                  <Badge variant="outline" className="rounded-full">{formatNumber(data.lines.length)} items</Badge>
                </div>
                <LineItemsTable lines={data.lines} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-3 p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <p className="text-sm font-semibold">Smart insights</p>
                </div>
                {data.insights.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
                    <Minus className="size-4" /> No notable insights for this invoice.
                  </div>
                ) : (
                  data.insights.map((insight, index) => <InsightCallout key={`${insight.title}-${index}`} insight={insight} />)
                )}
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5 text-success" /> Higher margin lines</span>
                  <span className="inline-flex items-center gap-1"><TrendingDown className="size-3.5 text-destructive" /> Below-cost lines</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
