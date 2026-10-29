import { prisma } from '#/lib/prisma'

export type DashboardMetric = {
  value: number
  previous: number
  change: number
}

export type DashboardOverview = {
  range: { months: number; from: string; to: string }
  summary: {
    revenue: DashboardMetric
    expenses: DashboardMetric
    profit: DashboardMetric
    outstanding: number
    outstandingCount: number
    totalRevenue: number
    totalExpenses: number
    customers: number
    products: number
    pendingPurchaseOrders: number
    stockValue: number
    lowStockCount: number
  }
  monthly: {
    month: string
    label: string
    revenue: number
    expenses: number
    profit: number
  }[]
  expenseCategories: { name: string; amount: number; percentage: number }[]
  invoiceStatus: { status: string; label: string; count: number; amount: number }[]
  topCustomers: {
    id: number
    name: string
    invoiceCount: number
    revenue: number
    outstanding: number
  }[]
  recentInvoices: {
    id: number
    invoiceNumber: string
    customerName: string
    invoiceDate: string
    status: string
    grandTotal: number
    balanceAmount: number
  }[]
  lowStock: {
    id: number
    batchNo: string
    productName: string
    skuCode: string
    unit: string
    availableQty: number
    totalQty: number
    slabCount: number
    ratio: number
  }[]
  insights: { tone: 'positive' | 'negative' | 'neutral'; title: string; description: string }[]
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  PARTIAL_PAID: 'Partially Paid',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
}

const STATUS_ORDER = ['PAID', 'PARTIAL_PAID', 'PENDING', 'DRAFT', 'CANCELLED']

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(date: Date): string {
  return `${date.toLocaleString('en-US', { month: 'short' })} '${String(date.getFullYear()).slice(2)}`
}

function buildMetric(value: number, previous: number): DashboardMetric {
  const change =
    previous === 0
      ? value === 0
        ? 0
        : 100
      : ((value - previous) / Math.abs(previous)) * 100

  return {
    value: round2(value),
    previous: round2(previous),
    change: round2(change),
  }
}

function formatInr(value: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(value))}`
}

export const dashboardRepository = {
  async getOverview(months: number): Promise<DashboardOverview> {
    const now = new Date()
    const currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const trendStart = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1)

    const [invoices, expenses, batches, customers, products, pendingPurchaseOrders] =
      await Promise.all([
        prisma.invoice.findMany({
          where: { isActive: true },
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            status: true,
            grandTotal: true,
            balanceAmount: true,
            customerId: true,
            customer: { select: { id: true, name: true } },
          },
          orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
        }),
        prisma.expense.findMany({
          where: { isActive: true },
          select: {
            id: true,
            expenseDate: true,
            amount: true,
            category: { select: { name: true } },
          },
          orderBy: [{ expenseDate: 'desc' }, { id: 'desc' }],
        }),
        prisma.inventoryBatch.findMany({
          where: { isActive: true },
          select: {
            id: true,
            batchNo: true,
            slabCount: true,
            totalQty: true,
            availableQty: true,
            buyingPrice: true,
            landingPrice: true,
            productVariant: {
              select: {
                skuCode: true,
                product: { select: { name: true } },
                unit: { select: { code: true } },
              },
            },
          },
        }),
        prisma.customer.count({ where: { isActive: true } }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.purchaseOrder.count({
          where: {
            isActive: true,
            status: { in: ['DRAFT', 'APPROVED', 'PARTIAL_RECEIVED'] },
          },
        }),
      ])

    const activeInvoices = invoices.filter((invoice) => invoice.status !== 'CANCELLED')
    const invoiceDate = (invoice: (typeof invoices)[number]) => new Date(invoice.invoiceDate)

    const sumInvoices = (start: Date, end: Date) =>
      activeInvoices
        .filter((invoice) => invoiceDate(invoice) >= start && invoiceDate(invoice) < end)
        .reduce((sum, invoice) => sum + Number(invoice.grandTotal ?? 0), 0)

    const sumExpenses = (start: Date, end: Date) =>
      expenses
        .filter((expense) => {
          const date = new Date(expense.expenseDate)
          return date >= start && date < end
        })
        .reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0)

    const currentRevenue = sumInvoices(currentStart, nextStart)
    const previousRevenue = sumInvoices(previousStart, currentStart)
    const currentExpenses = sumExpenses(currentStart, nextStart)
    const previousExpenses = sumExpenses(previousStart, currentStart)

    const outstandingInvoices = activeInvoices.filter(
      (invoice) => Number(invoice.balanceAmount ?? 0) > 0.01,
    )
    const outstanding = outstandingInvoices.reduce(
      (sum, invoice) => sum + Math.max(0, Number(invoice.balanceAmount ?? 0)),
      0,
    )
    const totalRevenue = activeInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.grandTotal ?? 0),
      0,
    )
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount ?? 0),
      0,
    )

    const monthlyMap = new Map<
      string,
      { month: string; label: string; revenue: number; expenses: number }
    >()

    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const key = monthKey(date)
      monthlyMap.set(key, { month: key, label: monthLabel(date), revenue: 0, expenses: 0 })
    }

    for (const invoice of activeInvoices) {
      const date = invoiceDate(invoice)
      if (date < trendStart || date >= nextStart) continue
      const bucket = monthlyMap.get(monthKey(date))
      if (bucket) bucket.revenue += Number(invoice.grandTotal ?? 0)
    }

    for (const expense of expenses) {
      const date = new Date(expense.expenseDate)
      if (date < trendStart || date >= nextStart) continue
      const bucket = monthlyMap.get(monthKey(date))
      if (bucket) bucket.expenses += Number(expense.amount ?? 0)
    }

    const monthly = Array.from(monthlyMap.values()).map((bucket) => ({
      month: bucket.month,
      label: bucket.label,
      revenue: round2(bucket.revenue),
      expenses: round2(bucket.expenses),
      profit: round2(bucket.revenue - bucket.expenses),
    }))

    const rangeExpenses = expenses.filter((expense) => {
      const date = new Date(expense.expenseDate)
      return date >= trendStart && date < nextStart
    })

    const categoryTotals = new Map<string, number>()
    for (const expense of rangeExpenses) {
      const name = expense.category?.name ?? 'Uncategorised'
      categoryTotals.set(name, (categoryTotals.get(name) ?? 0) + Number(expense.amount ?? 0))
    }

    const categoryTotal = Array.from(categoryTotals.values()).reduce((sum, value) => sum + value, 0)
    const sortedCategories = Array.from(categoryTotals.entries()).sort((a, b) => b[1] - a[1])
    const topCategories = sortedCategories.slice(0, 5)
    const otherAmount = sortedCategories
      .slice(5)
      .reduce((sum, [, amount]) => sum + amount, 0)

    const expenseCategories = topCategories.map(([name, amount]) => ({
      name,
      amount: round2(amount),
      percentage: categoryTotal > 0 ? round2((amount / categoryTotal) * 100) : 0,
    }))

    if (otherAmount > 0) {
      expenseCategories.push({
        name: 'Other',
        amount: round2(otherAmount),
        percentage: categoryTotal > 0 ? round2((otherAmount / categoryTotal) * 100) : 0,
      })
    }

    const statusTotals = new Map<string, { count: number; amount: number }>()
    for (const invoice of invoices) {
      const current = statusTotals.get(invoice.status) ?? { count: 0, amount: 0 }
      current.count += 1
      current.amount += Number(invoice.grandTotal ?? 0)
      statusTotals.set(invoice.status, current)
    }

    const invoiceStatus = STATUS_ORDER.filter((status) => statusTotals.has(status)).map(
      (status) => {
        const totals = statusTotals.get(status) ?? { count: 0, amount: 0 }
        return {
          status,
          label: STATUS_LABELS[status] ?? status,
          count: totals.count,
          amount: round2(totals.amount),
        }
      },
    )

    const customerRevenue = new Map<
      number,
      { id: number; name: string; invoiceCount: number; revenue: number }
    >()
    for (const invoice of activeInvoices) {
      const date = invoiceDate(invoice)
      if (date < trendStart || date >= nextStart) continue
      const current = customerRevenue.get(invoice.customerId) ?? {
        id: invoice.customer.id,
        name: invoice.customer.name,
        invoiceCount: 0,
        revenue: 0,
      }
      current.invoiceCount += 1
      current.revenue += Number(invoice.grandTotal ?? 0)
      customerRevenue.set(invoice.customerId, current)
    }

    const customerOutstanding = new Map<number, number>()
    for (const invoice of outstandingInvoices) {
      const amount = Math.max(0, Number(invoice.balanceAmount ?? 0))
      customerOutstanding.set(
        invoice.customerId,
        (customerOutstanding.get(invoice.customerId) ?? 0) + amount,
      )
    }

    const topCustomers = Array.from(customerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        invoiceCount: customer.invoiceCount,
        revenue: round2(customer.revenue),
        outstanding: round2(customerOutstanding.get(customer.id) ?? 0),
      }))

    const recentInvoices = invoices.slice(0, 7).map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customer.name,
      invoiceDate: invoiceDate(invoice).toISOString(),
      status: invoice.status,
      grandTotal: round2(Number(invoice.grandTotal ?? 0)),
      balanceAmount: round2(Number(invoice.balanceAmount ?? 0)),
    }))

    let stockValue = 0
    let lowStockCount = 0
    const lowStock = batches
      .map((batch) => {
        const totalQty = Number(batch.totalQty ?? 0)
        const availableQty = Number(batch.availableQty ?? 0)
        const ratio = totalQty > 0 ? availableQty / totalQty : 0
        stockValue += availableQty * Number(batch.landingPrice ?? batch.buyingPrice ?? 0)
        if (totalQty > 0 && ratio <= 0.1) lowStockCount += 1
        return {
          id: batch.id,
          batchNo: batch.batchNo,
          productName: batch.productVariant.product.name,
          skuCode: batch.productVariant.skuCode,
          unit: batch.productVariant.unit.code,
          availableQty: round2(availableQty),
          totalQty: round2(totalQty),
          slabCount: batch.slabCount ?? 0,
          ratio: round2(ratio * 100),
        }
      })
      .filter((batch) => batch.totalQty > 0 && batch.ratio <= 10)
      .sort((a, b) => a.ratio - b.ratio || a.availableQty - b.availableQty)
      .slice(0, 6)

    const revenueMetric = buildMetric(currentRevenue, previousRevenue)
    const expenseMetric = buildMetric(currentExpenses, previousExpenses)
    const profitMetric = buildMetric(currentRevenue - currentExpenses, previousRevenue - previousExpenses)

    const insights: DashboardOverview['insights'] = []

    if (currentRevenue > 0 || previousRevenue > 0) {
      insights.push({
        tone:
          revenueMetric.change > 0
            ? 'positive'
            : revenueMetric.change < 0
              ? 'negative'
              : 'neutral',
        title:
          revenueMetric.change === 0
            ? 'Revenue is steady'
            : `${Math.abs(revenueMetric.change).toFixed(1)}% ${
                revenueMetric.change > 0 ? 'growth' : 'drop'
              } in revenue`,
        description: `${formatInr(currentRevenue)} this month vs ${formatInr(
          previousRevenue,
        )} last month.`,
      })
    }

    if (currentRevenue > 0) {
      const margin = round2(((currentRevenue - currentExpenses) / currentRevenue) * 100)
      insights.push({
        tone: margin >= 20 ? 'positive' : margin >= 0 ? 'neutral' : 'negative',
        title: `Net margin at ${margin.toFixed(1)}%`,
        description: `${formatInr(currentRevenue - currentExpenses)} retained from ${formatInr(
          currentRevenue,
        )} revenue this month.`,
      })
    }

    if (outstanding > 0) {
      insights.push({
        tone: 'negative',
        title: `${formatInr(outstanding)} outstanding`,
        description: `Pending across ${outstandingInvoices.length} invoice${
          outstandingInvoices.length === 1 ? '' : 's'
        }. Follow up to improve cash flow.`,
      })
    } else {
      insights.push({
        tone: 'positive',
        title: 'No outstanding receivables',
        description: 'All active invoices are fully settled.',
      })
    }

    const topCategory = expenseCategories[0]
    if (topCategory && topCategory.amount > 0) {
      insights.push({
        tone: 'neutral',
        title: `Top expense: ${topCategory.name}`,
        description: `${formatInr(topCategory.amount)} (${topCategory.percentage.toFixed(
          0,
        )}% of spending) in the last ${months} months.`,
      })
    }

    if (lowStockCount > 0) {
      insights.push({
        tone: 'negative',
        title: `${lowStockCount} low-stock batch${lowStockCount === 1 ? '' : 'es'}`,
        description: 'Stock has fallen to 10% or less of the received quantity.',
      })
    }

    return {
      range: { months, from: trendStart.toISOString(), to: now.toISOString() },
      summary: {
        revenue: revenueMetric,
        expenses: expenseMetric,
        profit: profitMetric,
        outstanding: round2(outstanding),
        outstandingCount: outstandingInvoices.length,
        totalRevenue: round2(totalRevenue),
        totalExpenses: round2(totalExpenses),
        customers,
        products,
        pendingPurchaseOrders,
        stockValue: round2(stockValue),
        lowStockCount,
      },
      monthly,
      expenseCategories,
      invoiceStatus,
      topCustomers,
      recentInvoices,
      lowStock,
      insights,
    }
  },
}
