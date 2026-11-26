/** Shared contracts for the Sales Reports & Profit Analytics module. */

export type ReportGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ReportStatusFilter = 'active' | 'all'
export type ReportTone = 'positive' | 'negative' | 'neutral' | 'warning'

export type ReportRange = {
  from: string
  to: string
  granularity: ReportGranularity
  status: ReportStatusFilter
  generatedAt: string
}

export type ReportSummary = {
  invoiceCount: number
  itemsSold: number
  /** Total billed (grand total, including tax and round-off). */
  grandTotal: number
  /** Pre-tax sales before header discounts. */
  grossSales: number
  discounts: number
  itemDiscounts: number
  taxCollected: number
  /** Total billed - discounts - taxes. */
  netSales: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  operatingExpenses: number
  netProfit: number
  netMarginPct: number
  aov: number
  /** Percentage of sale lines whose unit cost could be resolved. */
  costCoveragePct: number
}

export type ReportPeriodRow = {
  key: string
  label: string
  periodStart: string
  periodEnd: string
  invoiceCount: number
  itemsSold: number
  grossSales: number
  discounts: number
  taxCollected: number
  grandTotal: number
  netSales: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  operatingExpenses: number
  netProfit: number
  aov: number
}

export type ReportLineItem = {
  id: number
  description: string
  productVariantId: number | null
  skuCode: string | null
  productName: string
  qty: number
  unitSellingPrice: number
  unitCostPrice: number | null
  lineTotal: number
  discountAmount: number
  lineProfit: number
  itemMarginPct: number
  profitContributionPct: number
  belowCost: boolean
}

export type ReportInvoiceRow = {
  id: number
  invoiceNumber: string
  invoiceDate: string
  /** Calendar date in Asia/Kolkata, used for report period matching. */
  localDate: string
  status: string
  customerId: number
  customerName: string
  customerMobile: string | null
  paymentMethod: string | null
  itemsSold: number
  subtotal: number
  discounts: number
  itemDiscounts: number
  taxCollected: number
  grandTotal: number
  netSales: number
  cogs: number
  grossProfit: number
  grossMarginPct: number
  costMissing: boolean
  lines: ReportLineItem[]
}

export type ReportDailyMarginRow = {
  date: string
  label: string
  invoiceCount: number
  netRevenue: number
  cogs: number
  grossProfit: number
  profitPct: number
  bestMarginInvoiceNumber: string | null
  bestMarginPct: number
  marginChangePct: number
  tone: ReportTone
}

export type ReportProductRow = {
  productVariantId: number | null
  skuCode: string
  productName: string
  invoiceCount: number
  unitsSold: number
  revenue: number
  cogs: number
  profit: number
  marginPct: number
}

export type ReportCustomerRow = {
  customerId: number
  name: string
  orderCount: number
  totalSpend: number
  aov: number
  profit: number
  avgMarginPct: number
  ltv: number
  lastPurchaseDate: string
}

export type ReportActivityRow = {
  label: string
  invoiceCount: number
  netSales: number
}

export type ReportInsight = {
  tone: ReportTone
  title: string
  description: string
}

export type DiscountImpact = {
  totalDiscounts: number
  itemDiscounts: number
  discountedInvoiceCount: number
  invoicesWithLoss: number
  grossProfitAfterDiscount: number
  estimatedGrossProfitWithoutDiscount: number
  discountErosion: number
  topDiscountedInvoices: Array<{
    invoiceId: number
    invoiceNumber: string
    invoiceDate: string
    customerName: string
    discounts: number
    grossMarginPct: number
  }>
}

export type ReportCostBasis = {
  method: string
  description: string
  totalLines: number
  linesWithCost: number
}

export type SalesReportData = {
  range: ReportRange
  summary: ReportSummary
  series: ReportPeriodRow[]
  invoices: ReportInvoiceRow[]
  dailyMargins: ReportDailyMarginRow[]
  topProfitInvoices: ReportInvoiceRow[]
  topMarginInvoices: ReportInvoiceRow[]
  topProducts: ReportProductRow[]
  topMarginProducts: ReportProductRow[]
  topFrequencyProducts: ReportProductRow[]
  topCustomers: ReportCustomerRow[]
  frequentCustomers: ReportCustomerRow[]
  peakHours: ReportActivityRow[]
  peakWeekdays: ReportActivityRow[]
  discountImpact: DiscountImpact
  insights: ReportInsight[]
  costBasis: ReportCostBasis
  expenseBreakdown: Array<{ category: string; amount: number; percentage: number }>
}

export type InvoiceInsightData = {
  invoice: {
    id: number
    invoiceNumber: string
    invoiceDate: string
    status: string
    paymentMethod: string | null
    customerId: number
    customerName: string
    customerMobile: string | null
    customerAddress: string | null
  }
  summary: {
    subtotal: number
    discount: number
    itemDiscounts: number
    tax: number
    loadingAmount: number
    transportAmount: number
    roundOffAmount: number
    grandTotal: number
    netSales: number
    cogs: number
    netGrossProfit: number
    profitMarginPct: number
  }
  lines: ReportLineItem[]
  storeAverageMarginPct: number
  comparison: 'above' | 'below' | 'equal'
  insights: ReportInsight[]
  costBasis: ReportCostBasis
}
