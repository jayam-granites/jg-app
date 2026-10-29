export type DashboardMetric = {
  value: number
  previous: number
  change: number
}

export type DashboardData = {
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
