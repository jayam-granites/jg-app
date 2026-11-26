import type { Prisma } from '@prisma/client'
import type {
  DiscountImpact,
  InvoiceInsightData,
  ReportActivityRow,
  ReportCostBasis,
  ReportCustomerRow,
  ReportDailyMarginRow,
  ReportGranularity,
  ReportInsight,
  ReportInvoiceRow,
  ReportLineItem,
  ReportPeriodRow,
  ReportProductRow,
  ReportStatusFilter,
  ReportSummary,
  SalesReportData,
} from '@jg-app/shared'
import { NotFoundError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'

const TIME_ZONE = 'Asia/Kolkata'
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_PERIODS = 10
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

type LocalParts = {
  year: number
  month: number
  day: number
  hour: number
  weekday: string
}

type Bucket = {
  key: string
  label: string
  periodStart: string
  periodEnd: string
}

type Totals = {
  invoiceCount: number
  itemsSold: number
  grossSales: number
  discounts: number
  itemDiscounts: number
  taxCollected: number
  grandTotal: number
  netSales: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
}

const INVOICE_SELECT = {
  id: true,
  invoiceNumber: true,
  invoiceDate: true,
  status: true,
  paymentMethod: true,
  subtotal: true,
  discountAmount: true,
  totalTaxAmount: true,
  loadingAmount: true,
  roundOffAmount: true,
  grandTotal: true,
  customerId: true,
  customer: { select: { id: true, name: true, mobile: true, address: true } },
  items: {
    where: { isActive: true },
    select: {
      id: true,
      invoiceId: true,
      description: true,
      productVariantId: true,
      qty: true,
      rate: true,
      amount: true,
      discountAmount: true,
      productVariant: {
        select: { skuCode: true, product: { select: { name: true } } },
      },
      inventoryBatch: { select: { landingPrice: true, buyingPrice: true } },
    },
    orderBy: { id: 'asc' },
  },
  invoiceTransports: { where: { isActive: true }, select: { amount: true } },
} as const

function fetchInvoices(where: Prisma.InvoiceWhereInput) {
  return prisma.invoice.findMany({
    where,
    select: INVOICE_SELECT,
    orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
  })
}

type InvoiceRecord = Awaited<ReturnType<typeof fetchInvoices>>[number]
type InvoiceItemRecord = InvoiceRecord['items'][number]

type RawLine = ReportLineItem & { invoiceId: number }

type InvoiceMetrics = {
  discounts: number
  itemDiscounts: number
  taxCollected: number
  grandTotal: number
  netSales: number
  grossSales: number
  loadingAmount: number
  transportAmount: number
  roundOffAmount: number
  itemsSold: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  linesWithCost: number
}

type ComputedInvoice = ReportInvoiceRow & {
  localDate: string
  hour: number
  weekday: string
  costMissing: boolean
  metrics: InvoiceMetrics
  rawLines: RawLine[]
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

type DecimalLike = number | bigint | string | { toString(): string }

function toNumber(value: DecimalLike | null | undefined): number {
  if (value == null) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function nullableNumber(value: DecimalLike | null | undefined): number | null {
  if (value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function safeMargin(profit: number, revenue: number): number {
  return revenue > 0 ? (profit / revenue) * 100 : 0
}

const localFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  weekday: 'short',
})

function localParts(date: Date): LocalParts {
  const parts = localFormatter.formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return {
    year: Number(value('year')),
    month: Number(value('month')),
    day: Number(value('day')),
    hour: Number(value('hour')),
    weekday: value('weekday'),
  }
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function dateKeyFromDate(date: Date): string {
  const parts = localParts(date)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function parseDateKey(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number)
  return { year, month, day }
}

function startOfLocalDay(key: string): Date {
  const { year, month, day } = parseDateKey(key)
  // Asia/Kolkata is UTC+05:30 year-round, so the offset never shifts.
  return new Date(Date.UTC(year, month - 1, day, -5, -30))
}

function endOfLocalDayExclusive(key: string): Date {
  return new Date(startOfLocalDay(key).getTime() + DAY_MS)
}

function addDays(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_PATTERN.test(key)) return false
  const { year, month, day } = parseDateKey(key)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function formatUtcKey(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function localDateLabel(key: string): string {
  const { year, month, day } = parseDateKey(key)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)))
}

function isoWeekInfo(monday: Date): { year: number; week: number } {
  const target = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()),
  )
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7))
  const year = target.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil(((target.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
  return { year, week }
}

function bucketFor(key: string, granularity: ReportGranularity): Bucket {
  if (granularity === 'daily') {
    return { key, label: localDateLabel(key), periodStart: key, periodEnd: key }
  }

  if (granularity === 'weekly') {
    const { year, month, day } = parseDateKey(key)
    const date = new Date(Date.UTC(year, month - 1, day))
    const monday = new Date(date.getTime() - ((date.getUTCDay() + 6) % 7) * DAY_MS)
    const sunday = new Date(monday.getTime() + 6 * DAY_MS)
    const start = formatUtcKey(monday)
    const { year: isoYear, week } = isoWeekInfo(monday)
    return {
      key: start,
      label: `W${pad(week)} ${isoYear}`,
      periodStart: start,
      periodEnd: formatUtcKey(sunday),
    }
  }

  if (granularity === 'monthly') {
    const month = key.slice(0, 7)
    const { year, month: monthNumber } = parseDateKey(`${month}-01`)
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'short',
      year: 'numeric',
    }).format(new Date(Date.UTC(year, monthNumber - 1, 1)))
    return {
      key: month,
      label,
      periodStart: `${month}-01`,
      periodEnd: formatUtcKey(new Date(Date.UTC(year, monthNumber, 0))),
    }
  }

  const year = key.slice(0, 4)
  return {
    key: year,
    label: year,
    periodStart: `${year}-01-01`,
    periodEnd: `${year}-12-31`,
  }
}

function enumerateBuckets(from: string, to: string, granularity: ReportGranularity): Bucket[] {
  const buckets = new Map<string, Bucket>()
  let cursor = from
  while (cursor <= to) {
    const bucket = bucketFor(cursor, granularity)
    if (!buckets.has(bucket.key)) buckets.set(bucket.key, bucket)
    cursor = addDays(cursor, 1)
  }
  return Array.from(buckets.values())
}

function emptyTotals(): Totals {
  return {
    invoiceCount: 0,
    itemsSold: 0,
    grossSales: 0,
    discounts: 0,
    itemDiscounts: 0,
    taxCollected: 0,
    grandTotal: 0,
    netSales: 0,
    cogs: 0,
    grossProfit: 0,
    operatingExpenses: 0,
  }
}

function addInvoiceToTotals(totals: Totals, invoice: ComputedInvoice): void {
  totals.invoiceCount += 1
  totals.itemsSold += invoice.metrics.itemsSold
  totals.grossSales += invoice.metrics.grossSales
  totals.discounts += invoice.metrics.discounts
  totals.itemDiscounts += invoice.metrics.itemDiscounts
  totals.taxCollected += invoice.metrics.taxCollected
  totals.grandTotal += invoice.metrics.grandTotal
  totals.netSales += invoice.metrics.netSales
  totals.cogs += invoice.metrics.cogs
  totals.grossProfit += invoice.metrics.grossProfit
}

function toPeriodRow(bucket: Bucket, totals: Totals): ReportPeriodRow {
  const netProfit = totals.grossProfit - totals.operatingExpenses
  return {
    key: bucket.key,
    label: bucket.label,
    periodStart: bucket.periodStart,
    periodEnd: bucket.periodEnd,
    invoiceCount: totals.invoiceCount,
    itemsSold: totals.itemsSold,
    grossSales: round2(totals.grossSales),
    discounts: round2(totals.discounts),
    taxCollected: round2(totals.taxCollected),
    grandTotal: round2(totals.grandTotal),
    netSales: round2(totals.netSales),
    cogs: round2(totals.cogs),
    grossProfit: round2(totals.grossProfit),
    grossMarginPct: round2(safeMargin(totals.grossProfit, totals.netSales)),
    operatingExpenses: round2(totals.operatingExpenses),
    netProfit: round2(netProfit),
    aov: round2(totals.invoiceCount > 0 ? totals.netSales / totals.invoiceCount : 0),
  }
}

function hasLandedCost(item: InvoiceItemRecord): boolean {
  return Boolean(item.inventoryBatch)
}

function directCost(item: InvoiceItemRecord): number | null {
  if (!item.inventoryBatch) return null
  return (
    nullableNumber(item.inventoryBatch.landingPrice) ??
    nullableNumber(item.inventoryBatch.buyingPrice)
  )
}

/**
 * Weighted-average cost per variant: landed batches win over purchase receipts,
 * and no future costs are considered for the requested reporting date.
 */
async function buildVariantCostMap(variantIds: number[], upTo: Date): Promise<Map<number, number>> {
  const ids = Array.from(new Set(variantIds))
  if (ids.length === 0) return new Map()

  const batches = await prisma.inventoryBatch.findMany({
    where: {
      isActive: true,
      productVariantId: { in: ids },
      createdAt: { lte: upTo },
    },
    select: {
      productVariantId: true,
      availableQty: true,
      landingPrice: true,
      buyingPrice: true,
    },
  })

  const weighted = new Map<number, { total: number; weight: number }>()
  for (const batch of batches) {
    const cost = nullableNumber(batch.landingPrice) ?? nullableNumber(batch.buyingPrice)
    const weight = Math.max(0, toNumber(batch.availableQty))
    if (cost === null || weight === 0) continue
    const current = weighted.get(batch.productVariantId) ?? { total: 0, weight: 0 }
    current.total += cost * weight
    current.weight += weight
    weighted.set(batch.productVariantId, current)
  }

  const costs = new Map<number, number>()
  for (const [variantId, value] of weighted) {
    if (value.weight > 0) costs.set(variantId, value.total / value.weight)
  }

  const remaining = ids.filter((id) => !costs.has(id))
  if (remaining.length === 0) return costs

  const receiptItems = await prisma.purchaseReceiptItem.findMany({
    where: {
      isActive: true,
      productVariantId: { in: remaining },
      purchaseReceipt: { isActive: true, receivedDate: { lte: upTo } },
    },
    select: {
      productVariantId: true,
      acceptedQty: true,
      receivedQty: true,
      landingPrice: true,
      buyingPrice: true,
    },
  })

  const receiptWeighted = new Map<number, { total: number; weight: number }>()
  for (const item of receiptItems) {
    const cost = nullableNumber(item.landingPrice) ?? nullableNumber(item.buyingPrice)
    const weight = Math.max(0, nullableNumber(item.acceptedQty) ?? toNumber(item.receivedQty))
    if (cost === null || weight === 0) continue
    const current = receiptWeighted.get(item.productVariantId) ?? { total: 0, weight: 0 }
    current.total += cost * weight
    current.weight += weight
    receiptWeighted.set(item.productVariantId, current)
  }

  for (const [variantId, value] of receiptWeighted) {
    if (value.weight > 0 && !costs.has(variantId)) {
      costs.set(variantId, value.total / value.weight)
    }
  }

  return costs
}

function resolveCost(item: InvoiceItemRecord, variantCosts: Map<number, number>): number | null {
  const direct = directCost(item)
  if (direct !== null) return direct
  if (item.productVariantId === null) return null
  return variantCosts.get(item.productVariantId) ?? null
}

function collectFallbackVariantIds(invoices: InvoiceRecord[]): number[] {
  const ids = new Set<number>()
  for (const invoice of invoices) {
    for (const item of invoice.items) {
      if (hasLandedCost(item) || item.productVariantId === null) continue
      ids.add(item.productVariantId)
    }
  }
  return Array.from(ids)
}

function invoiceAmounts(invoice: InvoiceRecord): InvoiceMetrics {
  const discounts = toNumber(invoice.discountAmount)
  const itemDiscounts = invoice.items.reduce(
    (sum, item) => sum + toNumber(item.discountAmount),
    0,
  )
  const taxCollected = toNumber(invoice.totalTaxAmount)
  const grandTotal = toNumber(invoice.grandTotal)
  const loadingAmount = toNumber(invoice.loadingAmount)
  const transportAmount = invoice.invoiceTransports.reduce(
    (sum, transport) => sum + toNumber(transport.amount),
    0,
  )

  return {
    discounts,
    itemDiscounts,
    taxCollected,
    grandTotal,
    netSales: grandTotal - discounts - taxCollected,
    grossSales: toNumber(invoice.subtotal) + loadingAmount + transportAmount,
    loadingAmount,
    transportAmount,
    roundOffAmount: toNumber(invoice.roundOffAmount),
    itemsSold: invoice.items.reduce((sum, item) => sum + toNumber(item.qty), 0),
    cogs: 0,
    grossProfit: 0,
    grossMarginPct: 0,
    linesWithCost: 0,
  }
}

function computeInvoice(invoice: InvoiceRecord, variantCosts: Map<number, number>): ComputedInvoice {
  const amounts = invoiceAmounts(invoice)
  const localDate = dateKeyFromDate(invoice.invoiceDate)
  const local = localParts(invoice.invoiceDate)

  const rawLines: RawLine[] = invoice.items.map((item) => {
    const qty = toNumber(item.qty)
    const rate = toNumber(item.rate)
    const lineTotal = toNumber(item.amount)
    const unitCost = resolveCost(item, variantCosts)
    // Unknown cost means the line contributes revenue only; coverage in the
    // response tells the caller how much of the COGS is unresolved.
    const lineCost = unitCost === null ? 0 : qty * unitCost
    const lineProfit = lineTotal - lineCost
    return {
      invoiceId: invoice.id,
      id: item.id,
      description: item.description ?? item.productVariant?.product.name ?? 'Item',
      productVariantId: item.productVariantId,
      skuCode: item.productVariant?.skuCode ?? null,
      productName: item.productVariant?.product.name ?? item.description ?? 'Uncategorised',
      qty,
      unitSellingPrice: rate,
      unitCostPrice: unitCost,
      lineTotal,
      discountAmount: toNumber(item.discountAmount),
      lineProfit,
      itemMarginPct: safeMargin(lineProfit, lineTotal),
      profitContributionPct: 0,
      belowCost: unitCost !== null && unitCost > rate,
    }
  })

  let cogs = 0
  let linesWithCost = 0
  for (const line of rawLines) {
    if (line.unitCostPrice === null) continue
    linesWithCost += 1
    cogs += line.qty * line.unitCostPrice
  }

  const grossProfit = amounts.netSales - cogs
  const grossMarginPct = safeMargin(grossProfit, amounts.netSales)
  for (const line of rawLines) {
    line.profitContributionPct = grossProfit > 0 ? (line.lineProfit / grossProfit) * 100 : 0
  }

  const lines: ReportLineItem[] = rawLines.map((line) => {
    const { invoiceId: _invoiceId, ...item } = line
    return {
      ...item,
      unitSellingPrice: round2(item.unitSellingPrice),
      unitCostPrice: item.unitCostPrice === null ? null : round2(item.unitCostPrice),
      lineTotal: round2(item.lineTotal),
      discountAmount: round2(item.discountAmount),
      lineProfit: round2(item.lineProfit),
      itemMarginPct: round2(item.itemMarginPct),
      profitContributionPct: round2(item.profitContributionPct),
    }
  })

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate.toISOString(),
    status: invoice.status,
    customerId: invoice.customerId,
    customerName: invoice.customer.name,
    customerMobile: invoice.customer.mobile,
    paymentMethod: invoice.paymentMethod,
    itemsSold: amounts.itemsSold,
    subtotal: round2(toNumber(invoice.subtotal)),
    discounts: round2(amounts.discounts),
    itemDiscounts: round2(amounts.itemDiscounts),
    taxCollected: round2(amounts.taxCollected),
    grandTotal: round2(amounts.grandTotal),
    netSales: round2(amounts.netSales),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    grossMarginPct: round2(grossMarginPct),
    costMissing: linesWithCost < lines.length,
    lines,
    localDate,
    hour: local.hour,
    weekday: local.weekday,
    metrics: {
      ...amounts,
      cogs,
      grossProfit,
      grossMarginPct,
      linesWithCost,
    },
    rawLines,
  }
}

function toReportInvoice(invoice: ComputedInvoice): ReportInvoiceRow {
  const { hour: _hour, weekday: _weekday, metrics: _metrics, rawLines: _rawLines, ...row } =
    invoice
  return row
}

function buildCostBasis(invoices: ComputedInvoice[]): ReportCostBasis {
  const totalLines = invoices.reduce((sum, invoice) => sum + invoice.rawLines.length, 0)
  const linesWithCost = invoices.reduce(
    (sum, invoice) => sum + invoice.metrics.linesWithCost,
    0,
  )
  return {
    method: 'batch-landed-cost-with-weighted-variant-fallback',
    description:
      'Invoice batch landed cost, then the available-quantity weighted average of active batches, then the accepted-quantity weighted average of active purchase receipts.',
    totalLines,
    linesWithCost,
  }
}

function buildSummary(invoices: ComputedInvoice[], operatingExpenses: number): ReportSummary {
  const totals = invoices.reduce<Totals>((current, invoice) => {
    addInvoiceToTotals(current, invoice)
    return current
  }, emptyTotals())
  totals.operatingExpenses = operatingExpenses
  const netProfit = totals.grossProfit - operatingExpenses
  const totalLines = invoices.reduce((sum, invoice) => sum + invoice.rawLines.length, 0)
  const linesWithCost = invoices.reduce(
    (sum, invoice) => sum + invoice.metrics.linesWithCost,
    0,
  )

  return {
    invoiceCount: totals.invoiceCount,
    itemsSold: totals.itemsSold,
    grandTotal: round2(totals.grandTotal),
    grossSales: round2(totals.grossSales),
    discounts: round2(totals.discounts),
    itemDiscounts: round2(totals.itemDiscounts),
    taxCollected: round2(totals.taxCollected),
    netSales: round2(totals.netSales),
    cogs: round2(totals.cogs),
    grossProfit: round2(totals.grossProfit),
    grossMarginPct: round2(safeMargin(totals.grossProfit, totals.netSales)),
    operatingExpenses: round2(operatingExpenses),
    netProfit: round2(netProfit),
    netMarginPct: round2(safeMargin(netProfit, totals.netSales)),
    aov: round2(totals.invoiceCount > 0 ? totals.netSales / totals.invoiceCount : 0),
    costCoveragePct: round2(totalLines > 0 ? (linesWithCost / totalLines) * 100 : 0),
  }
}

function buildSeries(
  buckets: Bucket[],
  invoices: ComputedInvoice[],
  expenses: Array<{ expenseDate: Date; amount: Prisma.Decimal }>,
  granularity: ReportGranularity,
): ReportPeriodRow[] {
  const totalsByKey = new Map<string, Totals>()
  const withData = new Set<string>()

  for (const bucket of buckets) {
    totalsByKey.set(bucket.key, emptyTotals())
  }

  for (const invoice of invoices) {
    const key = bucketFor(invoice.localDate, granularity).key
    const totals = totalsByKey.get(key) ?? emptyTotals()
    addInvoiceToTotals(totals, invoice)
    totalsByKey.set(key, totals)
    withData.add(key)
  }

  for (const expense of expenses) {
    const key = bucketFor(dateKeyFromDate(expense.expenseDate), granularity).key
    const totals = totalsByKey.get(key) ?? emptyTotals()
    totals.operatingExpenses += toNumber(expense.amount)
    totalsByKey.set(key, totals)
    withData.add(key)
  }

  const rows = buckets
    .filter((bucket) => withData.has(bucket.key))
    .map((bucket) => toPeriodRow(bucket, totalsByKey.get(bucket.key) ?? emptyTotals()))

  // Keep one representative bucket so an empty report still renders a chart.
  if (rows.length === 0 && buckets.length > 0) {
    rows.push(toPeriodRow(buckets[0], emptyTotals()))
  }

  return rows.sort((a, b) => a.key.localeCompare(b.key))
}

function dailyTone(profitPct: number): ReportInsight['tone'] {
  if (profitPct < 0) return 'negative'
  if (profitPct < 10) return 'warning'
  if (profitPct >= 20) return 'positive'
  return 'neutral'
}

function buildDailyMargins(invoices: ComputedInvoice[]): ReportDailyMarginRow[] {
  const byDate = new Map<string, ComputedInvoice[]>()
  for (const invoice of invoices) {
    const group = byDate.get(invoice.localDate) ?? []
    group.push(invoice)
    byDate.set(invoice.localDate, group)
  }

  const profitByDate = new Map<string, number>()
  const rows: ReportDailyMarginRow[] = []

  for (const date of Array.from(byDate.keys()).sort()) {
    const group = byDate.get(date) ?? []
    const netRevenue = group.reduce((sum, invoice) => sum + invoice.metrics.netSales, 0)
    const cogs = group.reduce((sum, invoice) => sum + invoice.metrics.cogs, 0)
    const grossProfit = netRevenue - cogs
    const profitPct = safeMargin(grossProfit, netRevenue)
    profitByDate.set(date, profitPct)

    const best = group.reduce<ComputedInvoice | null>((current, invoice) => {
      if (current === null) return invoice
      return invoice.metrics.grossMarginPct > current.metrics.grossMarginPct ? invoice : current
    }, null)

    rows.push({
      date,
      label: localDateLabel(date),
      invoiceCount: group.length,
      netRevenue: round2(netRevenue),
      cogs: round2(cogs),
      grossProfit: round2(grossProfit),
      profitPct: round2(profitPct),
      bestMarginInvoiceNumber: best?.invoiceNumber ?? null,
      bestMarginPct: round2(best?.metrics.grossMarginPct ?? 0),
      marginChangePct: 0,
      tone: dailyTone(profitPct),
    })
  }

  for (const row of rows) {
    const previous = profitByDate.get(addDays(row.date, -1))
    row.marginChangePct = previous === undefined ? 0 : round2(row.profitPct - previous)
  }

  return rows
}

function buildTopProducts(
  invoices: ComputedInvoice[],
  sortBy: 'profit' | 'margin' | 'frequency' = 'profit',
): ReportProductRow[] {
  const groups = new Map<
    string,
    {
      productVariantId: number | null
      skuCode: string
      productName: string
      invoiceIds: Set<number>
      unitsSold: number
      revenue: number
      cogs: number
      profit: number
    }
  >()

  for (const invoice of invoices) {
    for (const line of invoice.rawLines) {
      const key =
        line.productVariantId === null
          ? `line-${line.productName}`
          : `variant-${line.productVariantId}`
      const group = groups.get(key) ?? {
        productVariantId: line.productVariantId,
        skuCode: line.skuCode ?? '—',
        productName: line.productName,
        invoiceIds: new Set<number>(),
        unitsSold: 0,
        revenue: 0,
        cogs: 0,
        profit: 0,
      }
      group.invoiceIds.add(line.invoiceId)
      group.unitsSold += line.qty
      group.revenue += line.lineTotal
      group.cogs += line.unitCostPrice === null ? 0 : line.qty * line.unitCostPrice
      group.profit += line.lineProfit
      groups.set(key, group)
    }
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (sortBy === 'margin') {
        return (
          safeMargin(b.profit, b.revenue) - safeMargin(a.profit, a.revenue) ||
          b.profit - a.profit ||
          b.revenue - a.revenue
        )
      }
      if (sortBy === 'frequency') {
        return (
          b.invoiceIds.size - a.invoiceIds.size ||
          b.unitsSold - a.unitsSold ||
          b.revenue - a.revenue
        )
      }
      return b.profit - a.profit || b.revenue - a.revenue
    })
    .slice(0, MAX_PERIODS)
    .map((group) => ({
      productVariantId: group.productVariantId,
      skuCode: group.skuCode,
      productName: group.productName,
      invoiceCount: group.invoiceIds.size,
      unitsSold: group.unitsSold,
      revenue: round2(group.revenue),
      cogs: round2(group.cogs),
      profit: round2(group.profit),
      marginPct: round2(safeMargin(group.profit, group.revenue)),
    }))
}

function buildTopCustomers(
  invoices: ComputedInvoice[],
  ltvByCustomer: Map<number, number>,
  sortBy: 'spend' | 'frequency' = 'spend',
): ReportCustomerRow[] {
  const groups = new Map<
    number,
    {
      customerId: number
      name: string
      orderCount: number
      totalSpend: number
      profit: number
      lastPurchaseDate: string
    }
  >()

  for (const invoice of invoices) {
    const group = groups.get(invoice.customerId) ?? {
      customerId: invoice.customerId,
      name: invoice.customerName,
      orderCount: 0,
      totalSpend: 0,
      profit: 0,
      lastPurchaseDate: invoice.localDate,
    }
    group.orderCount += 1
    group.totalSpend += invoice.metrics.netSales
    group.profit += invoice.metrics.grossProfit
    if (invoice.localDate > group.lastPurchaseDate) group.lastPurchaseDate = invoice.localDate
    groups.set(invoice.customerId, group)
  }

  return Array.from(groups.values())
    .sort((a, b) =>
      sortBy === 'frequency'
        ? b.orderCount - a.orderCount || b.totalSpend - a.totalSpend || b.profit - a.profit
        : b.totalSpend - a.totalSpend || b.profit - a.profit,
    )
    .slice(0, MAX_PERIODS)
    .map((group) => ({
      customerId: group.customerId,
      name: group.name,
      orderCount: group.orderCount,
      totalSpend: round2(group.totalSpend),
      aov: round2(group.orderCount > 0 ? group.totalSpend / group.orderCount : 0),
      profit: round2(group.profit),
      avgMarginPct: round2(safeMargin(group.profit, group.totalSpend)),
      ltv: round2(ltvByCustomer.get(group.customerId) ?? 0),
      lastPurchaseDate: group.lastPurchaseDate,
    }))
}

const WEEKDAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildActivity(invoices: ComputedInvoice[]): {
  peakHours: ReportActivityRow[]
  peakWeekdays: ReportActivityRow[]
} {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    label: `${pad(hour)}:00`,
    invoiceCount: 0,
    netSales: 0,
  }))
  const weekdays = WEEKDAY_ORDER.map((label) => ({ label, invoiceCount: 0, netSales: 0 }))

  for (const invoice of invoices) {
    const hour = hours[invoice.hour]
    if (hour) {
      hour.invoiceCount += 1
      hour.netSales += invoice.metrics.netSales
    }
    const weekday = weekdays.find((row) => row.label === invoice.weekday)
    if (weekday) {
      weekday.invoiceCount += 1
      weekday.netSales += invoice.metrics.netSales
    }
  }

  const sortActivity = (a: ReportActivityRow, b: ReportActivityRow) =>
    b.invoiceCount - a.invoiceCount ||
    b.netSales - a.netSales ||
    a.label.localeCompare(b.label)

  return {
    peakHours: hours
      .map((row) => ({ ...row, netSales: round2(row.netSales) }))
      .sort(sortActivity),
    peakWeekdays: weekdays
      .map((row) => ({ ...row, netSales: round2(row.netSales) }))
      .sort(sortActivity),
  }
}

function buildDiscountImpact(invoices: ComputedInvoice[]): DiscountImpact {
  const invoiceDiscounts = invoices.reduce((sum, invoice) => sum + invoice.metrics.discounts, 0)
  const itemDiscounts = invoices.reduce((sum, invoice) => sum + invoice.metrics.itemDiscounts, 0)
  const grossProfitAfterDiscount = invoices.reduce(
    (sum, invoice) => sum + invoice.metrics.grossProfit,
    0,
  )
  const estimatedGrossProfitWithoutDiscount =
    grossProfitAfterDiscount + invoiceDiscounts + itemDiscounts

  const topDiscountedInvoices = Array.from(invoices)
    .sort(
      (a, b) =>
        b.metrics.discounts +
        b.metrics.itemDiscounts -
        (a.metrics.discounts + a.metrics.itemDiscounts),
    )
    .slice(0, MAX_PERIODS)
    .map((invoice) => ({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customerName,
      discounts: round2(invoice.metrics.discounts),
      grossMarginPct: round2(invoice.metrics.grossMarginPct),
    }))

  return {
    totalDiscounts: round2(invoiceDiscounts),
    itemDiscounts: round2(itemDiscounts),
    discountedInvoiceCount: invoices.filter(
      (invoice) => invoice.metrics.discounts + invoice.metrics.itemDiscounts > 0,
    ).length,
    invoicesWithLoss: invoices.filter((invoice) => invoice.metrics.grossProfit < 0).length,
    grossProfitAfterDiscount: round2(grossProfitAfterDiscount),
    estimatedGrossProfitWithoutDiscount: round2(estimatedGrossProfitWithoutDiscount),
    discountErosion: round2(estimatedGrossProfitWithoutDiscount - grossProfitAfterDiscount),
    topDiscountedInvoices,
  }
}

function formatInr(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))}`
}

function buildInsights(
  invoices: ComputedInvoice[],
  summary: ReportSummary,
  dailyMargins: ReportDailyMarginRow[],
  topProducts: ReportProductRow[],
  topCustomers: ReportCustomerRow[],
  costBasis: ReportCostBasis,
): ReportInsight[] {
  const insights: ReportInsight[] = []
  const byWeakestMargin = (a: ReportDailyMarginRow, b: ReportDailyMarginRow) => a.profitPct - b.profitPct
  const negativeDays = dailyMargins.filter((row) => row.profitPct < 0).sort(byWeakestMargin)
  const thinDays = dailyMargins
    .filter((row) => row.profitPct >= 0 && row.profitPct < 10)
    .sort(byWeakestMargin)

  if (negativeDays.length > 0) {
    insights.push({
      tone: 'negative',
      title: `${negativeDays.length} day${negativeDays.length === 1 ? '' : 's'} sold below cost`,
      description: `Weakest day ${negativeDays[0].label} at ${negativeDays[0].profitPct.toFixed(1)}% margin. Review discounts and landed costs.`,
    })
  } else if (thinDays.length > 0) {
    insights.push({
      tone: 'warning',
      title: `${thinDays.length} thin-margin day${thinDays.length === 1 ? '' : 's'}`,
      description: `${thinDays[0].label} closed at ${thinDays[0].profitPct.toFixed(1)}%, below the 10% watch level.`,
    })
  }

  const erosion = summary.discounts + summary.itemDiscounts
  if (summary.grossSales > 0 && (erosion / summary.grossSales) * 100 >= 5) {
    insights.push({
      tone: 'warning',
      title: 'Discounting is eroding margin',
      description: `${formatInr(erosion)} given away across ${summary.invoiceCount} invoices (${round2((erosion / summary.grossSales) * 100).toFixed(1)}% of gross sales).`,
    })
  }

  const belowCostLines = invoices.reduce(
    (count, invoice) => count + invoice.rawLines.filter((line) => line.belowCost).length,
    0,
  )
  if (belowCostLines > 0) {
    insights.push({
      tone: 'negative',
      title: `${belowCostLines} line${belowCostLines === 1 ? '' : 's'} billed below cost`,
      description: 'Selling price is lower than the resolved unit cost. Confirm pricing and cost capture.',
    })
  }

  const topProduct = topProducts[0]
  if (topProduct && topProduct.profit > 0) {
    insights.push({
      tone: 'positive',
      title: `Top profit product: ${topProduct.productName}`,
      description: `${formatInr(topProduct.profit)} profit from ${topProduct.unitsSold} units at ${topProduct.marginPct.toFixed(1)}% margin.`,
    })
  }

  const topCustomer = topCustomers[0]
  if (topCustomer && summary.netSales > 0 && (topCustomer.totalSpend / summary.netSales) * 100 >= 40) {
    insights.push({
      tone: 'warning',
      title: `Revenue is concentrated in ${topCustomer.name}`,
      description: `${round2((topCustomer.totalSpend / summary.netSales) * 100).toFixed(1)}% of net sales came from one customer.`,
    })
  }

  if (costBasis.totalLines > costBasis.linesWithCost) {
    const missing = costBasis.totalLines - costBasis.linesWithCost
    insights.push({
      tone: 'warning',
      title: `${missing} line${missing === 1 ? '' : 's'} without a cost`,
      description: 'Profit totals exclude cost for these lines. Add batches or purchase receipts to improve confidence.',
    })
  }

  if (insights.length === 0) {
    insights.push({
      tone: summary.netProfit >= 0 ? 'positive' : 'negative',
      title: summary.netProfit >= 0 ? 'Healthy operating result' : 'Operating loss',
      description: `Net profit of ${formatInr(summary.netProfit)} on ${formatInr(summary.netSales)} net sales.`,
    })
  }

  return insights
}

async function fetchCustomerLtv(): Promise<Map<number, number>> {
  const rows = await prisma.invoice.groupBy({
    by: ['customerId'],
    where: { isActive: true, status: { not: 'CANCELLED' } },
    _sum: { grandTotal: true, discountAmount: true, totalTaxAmount: true },
  })

  return new Map(
    rows.map((row) => [
      row.customerId,
      Math.max(
        0,
        toNumber(row._sum.grandTotal) -
          toNumber(row._sum.discountAmount) -
          toNumber(row._sum.totalTaxAmount),
      ),
    ]),
  )
}

async function computeStoreMargin(
  from: Date,
  to: Date | undefined,
  upTo: Date,
): Promise<{ margin: number; count: number }> {
  const invoices = await fetchInvoices({
    isActive: true,
    status: { not: 'CANCELLED' },
    invoiceDate: to ? { gte: from, lt: to } : { gte: from },
  })

  if (invoices.length === 0) return { margin: 0, count: 0 }

  const variantCosts = await buildVariantCostMap(collectFallbackVariantIds(invoices), upTo)
  let netSales = 0
  let cogs = 0

  for (const invoice of invoices) {
    const amounts = invoiceAmounts(invoice)
    netSales += amounts.netSales
    for (const item of invoice.items) {
      const cost = resolveCost(item, variantCosts)
      if (cost !== null) cogs += toNumber(item.qty) * cost
    }
  }

  return { margin: safeMargin(netSales - cogs, netSales), count: invoices.length }
}

function buildInvoiceInsights(
  invoice: ComputedInvoice,
  comparison: InvoiceInsightData['comparison'],
  storeAverageMarginPct: number,
): ReportInsight[] {
  const insights: ReportInsight[] = []
  const bestLine = invoice.rawLines
    .filter((line) => line.unitCostPrice !== null && line.lineTotal > 0)
    .sort((a, b) => b.itemMarginPct - a.itemMarginPct || b.lineProfit - a.lineProfit)[0]

  if (bestLine) {
    insights.push({
      tone: bestLine.belowCost ? 'warning' : 'positive',
      title: `Best margin item: ${bestLine.description}`,
      description: `${bestLine.itemMarginPct.toFixed(1)}% margin on ${formatInr(bestLine.lineProfit)} profit.`,
    })
  }

  const discount = invoice.metrics.discounts + invoice.metrics.itemDiscounts
  if (discount > 0) {
    insights.push({
      tone: invoice.metrics.grossMarginPct < 10 ? 'warning' : 'neutral',
      title: `${formatInr(discount)} discounted on this bill`,
      description:
        invoice.metrics.grossMarginPct < 10
          ? 'Discounts are pushing this invoice below the 10% margin watch level.'
          : 'Header and item discounts are already reflected in the line amounts.',
    })
  }

  const belowCost = invoice.rawLines.filter((line) => line.belowCost).length
  if (belowCost > 0) {
    insights.push({
      tone: 'negative',
      title: `${belowCost} item${belowCost === 1 ? '' : 's'} sold below cost`,
      description: 'Selling rate is lower than the resolved cost. Verify pricing before the next bill.',
    })
  }

  insights.push({
    tone: comparison === 'above' ? 'positive' : comparison === 'below' ? 'warning' : 'neutral',
    title:
      comparison === 'above'
        ? 'Margin above store average'
        : comparison === 'below'
          ? 'Margin below store average'
          : 'Margin matches store average',
    description: `This bill: ${invoice.metrics.grossMarginPct.toFixed(1)}% vs store average ${storeAverageMarginPct.toFixed(1)}%.`,
  })

  return insights
}

export const reportsRepository = {
  async getSalesReport(
    from: string,
    to: string,
    granularity: ReportGranularity,
    status: ReportStatusFilter,
  ): Promise<SalesReportData> {
    const fromStart = startOfLocalDay(from)
    const toExclusive = endOfLocalDayExclusive(to)

    const [records, expenses, ltvByCustomer] = await Promise.all([
      fetchInvoices({
        isActive: true,
        invoiceDate: { gte: fromStart, lt: toExclusive },
        ...(status === 'active' ? { status: { not: 'CANCELLED' as const } } : {}),
      }),
      prisma.expense.findMany({
        where: {
          isActive: true,
          isPurchaseExpense: false,
          expenseDate: { gte: fromStart, lt: toExclusive },
        },
        select: { expenseDate: true, amount: true, category: { select: { name: true } } },
      }),
      fetchCustomerLtv(),
    ])

    const variantCosts = await buildVariantCostMap(
      collectFallbackVariantIds(records),
      toExclusive,
    )
    const invoices = records.map((record) => computeInvoice(record, variantCosts))
    const operatingExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0)

    const summary = buildSummary(invoices, operatingExpenses)
    const costBasis = buildCostBasis(invoices)
    const dailyMargins = buildDailyMargins(invoices)
    const topProducts = buildTopProducts(invoices, 'profit')
    const topMarginProducts = buildTopProducts(invoices, 'margin')
    const topFrequencyProducts = buildTopProducts(invoices, 'frequency')
    const topCustomers = buildTopCustomers(invoices, ltvByCustomer, 'spend')
    const frequentCustomers = buildTopCustomers(invoices, ltvByCustomer, 'frequency')
    const activity = buildActivity(invoices)
    const discountImpact = buildDiscountImpact(invoices)

    const categoryTotals = new Map<string, number>()
    for (const expense of expenses) {
      const category = expense.category?.name ?? 'Uncategorised'
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + toNumber(expense.amount))
    }
    const expenseBreakdown = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        category,
        amount: round2(amount),
        percentage: round2(safeMargin(amount, operatingExpenses)),
      }))

    return {
      range: {
        from,
        to,
        granularity,
        status,
        generatedAt: new Date().toISOString(),
      },
      summary,
      series: buildSeries(
        enumerateBuckets(from, to, granularity),
        invoices,
        expenses,
        granularity,
      ),
      invoices: invoices.map(toReportInvoice),
      dailyMargins,
      topProfitInvoices: Array.from(invoices)
        .sort((a, b) => b.metrics.grossProfit - a.metrics.grossProfit)
        .slice(0, MAX_PERIODS)
        .map(toReportInvoice),
      topMarginInvoices: Array.from(invoices)
        .filter((invoice) => invoice.metrics.netSales > 0)
        .sort((a, b) => b.metrics.grossMarginPct - a.metrics.grossMarginPct)
        .slice(0, MAX_PERIODS)
        .map(toReportInvoice),
      topProducts,
      topMarginProducts,
      topFrequencyProducts,
      topCustomers,
      frequentCustomers,
      peakHours: activity.peakHours,
      peakWeekdays: activity.peakWeekdays,
      discountImpact,
      insights: buildInsights(
        invoices,
        summary,
        dailyMargins,
        topProducts,
        topCustomers,
        costBasis,
      ),
      costBasis,
      expenseBreakdown,
    }
  },

  async getInvoiceInsight(id: number): Promise<InvoiceInsightData> {
    const record = await prisma.invoice.findUnique({ where: { id }, select: INVOICE_SELECT })
    if (!record) throw new NotFoundError('Invoice')

    const localDate = dateKeyFromDate(record.invoiceDate)
    const upTo = endOfLocalDayExclusive(localDate)
    const now = new Date()
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setUTCFullYear(twelveMonthsAgo.getUTCFullYear() - 1)
    const storeUpTo = new Date(now.getTime() + DAY_MS)

    const [variantCosts, recentStore] = await Promise.all([
      buildVariantCostMap(collectFallbackVariantIds([record]), upTo),
      computeStoreMargin(twelveMonthsAgo, storeUpTo, storeUpTo),
    ])
    const allTimeStore =
      recentStore.count > 0
        ? recentStore
        : await computeStoreMargin(new Date(0), undefined, storeUpTo)
    const store = allTimeStore.count > 0 ? allTimeStore.margin : 0
    const storeAverageMarginPct = round2(store)
    const invoice = computeInvoice(record, variantCosts)
    const comparison: InvoiceInsightData['comparison'] =
      invoice.metrics.grossMarginPct > storeAverageMarginPct + 0.005
        ? 'above'
        : invoice.metrics.grossMarginPct < storeAverageMarginPct - 0.005
          ? 'below'
          : 'equal'

    return {
      invoice: {
        id: record.id,
        invoiceNumber: record.invoiceNumber,
        invoiceDate: record.invoiceDate.toISOString(),
        status: record.status,
        paymentMethod: record.paymentMethod,
        customerId: record.customerId,
        customerName: record.customer.name,
        customerMobile: record.customer.mobile,
        customerAddress: record.customer.address,
      },
      summary: {
        subtotal: round2(toNumber(record.subtotal)),
        discount: round2(invoice.metrics.discounts),
        itemDiscounts: round2(invoice.metrics.itemDiscounts),
        tax: round2(invoice.metrics.taxCollected),
        loadingAmount: round2(invoice.metrics.loadingAmount),
        transportAmount: round2(invoice.metrics.transportAmount),
        roundOffAmount: round2(invoice.metrics.roundOffAmount),
        grandTotal: round2(invoice.metrics.grandTotal),
        netSales: round2(invoice.metrics.netSales),
        cogs: round2(invoice.metrics.cogs),
        netGrossProfit: round2(invoice.metrics.grossProfit),
        profitMarginPct: round2(invoice.metrics.grossMarginPct),
      },
      lines: invoice.rawLines.map(({ invoiceId: _invoiceId, ...line }) => line),
      storeAverageMarginPct,
      comparison,
      insights: buildInvoiceInsights(invoice, comparison, storeAverageMarginPct),
      costBasis: buildCostBasis([invoice]),
    }
  },
}

export { isValidDateKey }
