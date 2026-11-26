import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardList,
  IndianRupee,
  Lightbulb,
  Minus,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  Warehouse,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageLayout } from '@/shared/components/page-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/date'
import { formatCompactCurrency, formatCurrency, formatNumber } from '@/lib/format'
import { useDashboard } from '../hooks/use-dashboard'
import { DonutChart, Sparkline, TrendChart } from '../components/charts'

const STATUS_BADGE: Record<string, string> = {
  PAID: 'border-0 bg-success/12 text-success dark:bg-success/15 dark:text-success',
  PARTIAL_PAID: 'border-0 bg-warning/12 text-warning dark:bg-warning/15 dark:text-warning',
  PENDING: 'border-0 bg-info/12 text-info dark:bg-info/15 dark:text-info',
  DRAFT: 'border-0 bg-muted text-muted-foreground',
  CANCELLED: 'border-0 bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive',
}

const STATUS_COLORS: Record<string, string> = {
  PAID: 'var(--chart-2)',
  PARTIAL_PAID: 'var(--chart-3)',
  PENDING: 'var(--chart-1)',
  DRAFT: 'var(--muted-foreground)',
  CANCELLED: 'var(--chart-5)',
}

const CATEGORY_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--muted-foreground)',
]

type Tone = 'blue' | 'orange' | 'green' | 'red'

const TONE_CLASSES: Record<Tone, string> = {
  blue: 'bg-primary/10 text-primary',
  orange: 'bg-warning/12 text-warning dark:bg-warning/15 dark:text-warning',
  green: 'bg-success/12 text-success dark:bg-success/15 dark:text-success',
  red: 'bg-destructive/10 text-destructive dark:bg-destructive/30 dark:text-destructive',
}

function KpiCard({
  title,
  value,
  change,
  higherIsBetter,
  icon: Icon,
  tone,
  sparkline,
  caption,
}: {
  title: string
  value: string
  change?: number
  higherIsBetter?: boolean
  icon: LucideIcon
  tone: Tone
  sparkline?: number[]
  caption?: string
}) {
  const hasChange = typeof change === 'number'
  const good = higherIsBetter ? (change ?? 0) >= 0 : (change ?? 0) <= 0
  const ChangeIcon = !hasChange || change === 0 ? Minus : change! > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          </div>
          <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[tone])}>
            <Icon className="size-5" />
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            {hasChange ? (
              <div className="flex items-center gap-1 text-xs">
                <ChangeIcon
                  className={cn(
                    'size-3.5',
                    change === 0
                      ? 'text-muted-foreground'
                      : good
                        ? 'text-success dark:text-success'
                        : 'text-destructive dark:text-destructive',
                  )}
                />
                <span
                  className={cn(
                    'font-medium',
                    change === 0
                      ? 'text-muted-foreground'
                      : good
                        ? 'text-success dark:text-success'
                        : 'text-destructive dark:text-destructive',
                  )}
                >
                  {change === 0 ? 'No change' : `${change! > 0 ? '+' : ''}${change!.toFixed(1)}%`}
                </span>
                <span className="text-muted-foreground">vs last month</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{caption}</p>
            )}
          </div>
          {sparkline && sparkline.length > 1 && (
            <Sparkline
              values={sparkline}
              color={
                tone === 'orange'
                  ? 'var(--chart-5)'
                  : tone === 'green'
                    ? 'var(--chart-2)'
                    : 'var(--chart-1)'
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function StatTile({
  title,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  title: string
  value: string
  caption: string
  icon: LucideIcon
  tone: Tone
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-xs">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONE_CLASSES[tone])}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className="truncate text-lg font-semibold leading-tight">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{caption}</p>
      </div>
    </div>
  )
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-sm text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  )
}

export function DashboardPage() {
  const [months, setMonths] = useState(6)
  const { data, isLoading, isError, refetch } = useDashboard(months)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-lg lg:col-span-2" />
          <Skeleton className="h-80 rounded-lg" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <PageLayout title="Dashboard" description="Overview of your business performance">
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <AlertTriangle className="size-8 text-warning" />
            <div>
              <p className="font-medium">Could not load dashboard insights</p>
              <p className="text-sm text-muted-foreground">
                Check the API connection and try again.
              </p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    )
  }

  const { summary, monthly, expenseCategories, invoiceStatus, topCustomers, recentInvoices, lowStock, insights } =
    data
  const invoiceTotal = invoiceStatus.reduce((sum, item) => sum + item.count, 0)
  const revenueSparkline = monthly.map((item) => item.revenue)
  const expenseSparkline = monthly.map((item) => item.expenses)
  const profitSparkline = monthly.map((item) => item.profit)

  return (
    <PageLayout
      title="Dashboard"
      description={`Business performance for the last ${months} months`}
      action={
        <div className="inline-flex rounded-lg border border-border/70 bg-card p-1 shadow-xs">
          {[6, 12].map((option) => (
            <Button
              key={option}
              size="sm"
              variant={months === option ? 'default' : 'ghost'}
              className="h-8 px-3"
              aria-pressed={months === option}
              onClick={() => setMonths(option)}
            >
              {option}M
            </Button>
          ))}
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Revenue"
          value={formatCurrency(summary.revenue.value)}
          change={summary.revenue.change}
          higherIsBetter
          icon={IndianRupee}
          tone="blue"
          sparkline={revenueSparkline}
        />
        <KpiCard
          title="Expenses"
          value={formatCurrency(summary.expenses.value)}
          change={summary.expenses.change}
          higherIsBetter={false}
          icon={Wallet}
          tone="orange"
          sparkline={expenseSparkline}
        />
        <KpiCard
          title="Net Profit"
          value={formatCurrency(summary.profit.value)}
          change={summary.profit.change}
          higherIsBetter
          icon={TrendingUp}
          tone="green"
          sparkline={profitSparkline}
        />
        <KpiCard
          title="Outstanding"
          value={formatCurrency(summary.outstanding)}
          icon={Receipt}
          tone="red"
          caption={`${formatNumber(summary.outstandingCount)} invoice${
            summary.outstandingCount === 1 ? '' : 's'
          } awaiting payment`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          title="Customers"
          value={formatNumber(summary.customers)}
          caption="Active customer accounts"
          icon={Users}
          tone="blue"
        />
        <StatTile
          title="Products"
          value={formatNumber(summary.products)}
          caption="Active product catalogue"
          icon={Package}
          tone="green"
        />
        <StatTile
          title="Pending POs"
          value={formatNumber(summary.pendingPurchaseOrders)}
          caption="Draft, approved or partial"
          icon={ClipboardList}
          tone="orange"
        />
        <StatTile
          title="Stock Value"
          value={formatCompactCurrency(summary.stockValue)}
          caption={
            summary.lowStockCount > 0
              ? `${summary.lowStockCount} low-stock batch${summary.lowStockCount === 1 ? '' : 'es'}`
              : 'All batches healthy'
          }
          icon={Warehouse}
          tone={summary.lowStockCount > 0 ? 'red' : 'green'}
        />
      </div>

      {insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {insights.slice(0, 4).map((insight) => {
            const Icon =
              insight.tone === 'positive'
                ? CheckCircle2
                : insight.tone === 'negative'
                  ? AlertTriangle
                  : Lightbulb
            const color =
              insight.tone === 'positive'
                ? 'text-success dark:text-success'
                : insight.tone === 'negative'
                  ? 'text-warning dark:text-warning'
                  : 'text-primary'
            return (
              <div
                key={insight.title}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-xs"
              >
                <Icon className={cn('mt-0.5 size-4 shrink-0', color)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{insight.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
            <CardDescription>Monthly performance over the last {months} months</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={monthly} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Status</CardTitle>
            <CardDescription>Distribution by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={invoiceStatus.map((item) => ({
                label: item.label,
                value: item.count,
                display: `${formatNumber(item.count)} · ${formatCompactCurrency(item.amount)}`,
                color: STATUS_COLORS[item.status] ?? 'var(--chart-1)',
              }))}
              centerLabel="Invoices"
              centerValue={formatNumber(invoiceTotal)}
            />
            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Billed (all time)</p>
                <p className="font-semibold">{formatCompactCurrency(summary.totalRevenue)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Recorded expenses</p>
                <p className="font-semibold">{formatCompactCurrency(summary.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Breakdown</CardTitle>
            <CardDescription>Where money went over the last {months} months</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No expenses recorded in this period
              </div>
            ) : (
              <div className="space-y-4">
                {expenseCategories.map((category, index) => (
                  <div key={category.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{category.name}</span>
                      <span className="shrink-0 text-muted-foreground">
                        {formatCurrency(category.amount)}
                        <span className="ml-2 text-xs">{category.percentage.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max(category.percentage, 2)}%`,
                          backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory Watch</CardTitle>
            <CardDescription>Batches at or below 10% of received quantity</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
                <CheckCircle2 className="size-7 text-success" />
                <p className="text-sm font-medium">Stock levels look healthy</p>
                <p className="text-xs text-muted-foreground">No low-stock batches right now.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b py-3 last:border-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.productName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.batchNo} · {item.skuCode}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium">
                        {formatNumber(item.availableQty)} / {formatNumber(item.totalQty)} {item.unit}
                      </p>
                      <p className="text-xs text-warning dark:text-warning">
                        {item.ratio.toFixed(0)}% remaining
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Customers</CardTitle>
            <CardDescription>Highest revenue in the selected period</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Invoices</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.length === 0 ? (
                  <EmptyRow colSpan={4} message="No customer revenue in this period" />
                ) : (
                  topCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatNumber(customer.invoiceCount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.revenue)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right',
                          customer.outstanding > 0
                            ? 'text-warning dark:text-warning'
                            : 'text-muted-foreground',
                        )}
                      >
                        {formatCurrency(customer.outstanding)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Invoices</CardTitle>
            <CardDescription>Latest billing activity</CardDescription>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentInvoices.length === 0 ? (
                  <EmptyRow colSpan={5} message="No invoices created yet" />
                ) : (
                  recentInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          to="/invoices/$id"
                          params={{ id: String(invoice.id) }}
                          className="font-mono text-sm font-medium text-primary hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {invoice.customerName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_BADGE[invoice.status] ?? ''}>
                          {invoice.status.replaceAll('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-medium">{formatCurrency(invoice.grandTotal)}</p>
                        {invoice.balanceAmount > 0 && (
                          <p className="text-xs text-warning dark:text-warning">
                            {formatCurrency(invoice.balanceAmount)} due
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
