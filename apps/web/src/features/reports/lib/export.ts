import type { SalesReportData } from '@jg-app/shared'
import { exportToExcel, safeFileName, type ExcelBlock } from '@/lib/excel'
import { formatDate } from '@/lib/date'

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',')
}

/** Builds a spreadsheet-friendly CSV including summary, period and invoice data. */
export function buildSalesCsv(data: SalesReportData): string {
  const { range, summary, series, invoices, dailyMargins, topProducts, topCustomers } = data
  const rows: unknown[][] = [
    ['Sales Report', `${formatDate(range.from)} to ${formatDate(range.to)}`],
    ['Granularity', range.granularity],
    ['Status filter', range.status],
    [],
    ['Summary', 'Value'],
    ['Total invoices', summary.invoiceCount],
    ['Items sold', summary.itemsSold],
    ['Gross sales', summary.grossSales],
    ['Discounts', summary.discounts],
    ['Item discounts', summary.itemDiscounts],
    ['Tax collected', summary.taxCollected],
    ['Net sales', summary.netSales],
    ['COGS', summary.cogs],
    ['Gross profit', summary.grossProfit],
    ['Gross margin %', summary.grossMarginPct],
    ['Operating expenses', summary.operatingExpenses],
    ['Net profit', summary.netProfit],
    ['Net margin %', summary.netMarginPct],
    ['AOV', summary.aov],
    ['Cost coverage %', summary.costCoveragePct],
    [],
    ['Period', 'Invoices', 'Items sold', 'Net sales', 'COGS', 'Gross profit', 'Profit %', 'AOV', 'Net profit'],
    ...series.map((row) => [
      row.label, row.invoiceCount, row.itemsSold, row.netSales, row.cogs,
      row.grossProfit, row.grossMarginPct, row.aov, row.netProfit,
    ]),
    [],
    ['Date', 'Invoices', 'Net revenue', 'COGS', 'Gross profit', 'Profit %', 'Best margin invoice', 'Margin change %'],
    ...dailyMargins.map((row) => [
      row.label, row.invoiceCount, row.netRevenue, row.cogs, row.grossProfit,
      row.profitPct, row.bestMarginInvoiceNumber, row.marginChangePct,
    ]),
    [],
    ['Invoice #', 'Date', 'Customer', 'Status', 'Net sales', 'COGS', 'Gross profit', 'Margin %'],
    ...invoices.map((row) => [
      row.invoiceNumber, formatDate(row.invoiceDate), row.customerName, row.status, row.netSales,
      row.cogs, row.grossProfit, row.grossMarginPct,
    ]),
    [],
    ['Product', 'SKU', 'Invoices', 'Units sold', 'Revenue', 'Profit', 'Margin %'],
    ...topProducts.map((row) => [
      row.productName, row.skuCode, row.invoiceCount, row.unitsSold, row.revenue, row.profit, row.marginPct,
    ]),
    [],
    ['Customer', 'Orders', 'Total spend', 'AOV', 'Profit', 'Margin %', 'LTV', 'Last purchase'],
    ...topCustomers.map((row) => [
      row.name, row.orderCount, row.totalSpend, row.aov, row.profit, row.avgMarginPct, row.ltv, formatDate(row.lastPurchaseDate),
    ]),
  ]
  return `\uFEFF${rows.map(csvRow).join('\r\n')}`
}

export function downloadSalesCsv(data: SalesReportData, filename: string) {
  const blob = new Blob([buildSalesCsv(data)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${safeFileName(filename)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export async function exportSalesExcel(data: SalesReportData, filename: string) {
  const blocks: ExcelBlock<any>[] = [
    {
      sheet: 'Summary',
      columnWidths: [28, 20],
      summary: [
        { label: 'Sales Report', value: `${formatDate(data.range.from)} to ${formatDate(data.range.to)}` },
        { label: 'Granularity', value: data.range.granularity },
        { label: 'Status filter', value: data.range.status },
        { label: 'Total invoices', value: data.summary.invoiceCount },
        { label: 'Items sold', value: data.summary.itemsSold },
        { label: 'Gross sales', value: data.summary.grossSales },
        { label: 'Discounts', value: data.summary.discounts },
        { label: 'Item discounts', value: data.summary.itemDiscounts },
        { label: 'Tax collected', value: data.summary.taxCollected },
        { label: 'Net sales', value: data.summary.netSales },
        { label: 'COGS', value: data.summary.cogs },
        { label: 'Gross profit', value: data.summary.grossProfit },
        { label: 'Gross margin %', value: data.summary.grossMarginPct },
        { label: 'Operating expenses', value: data.summary.operatingExpenses },
        { label: 'Net profit', value: data.summary.netProfit },
        { label: 'Net margin %', value: data.summary.netMarginPct },
        { label: 'AOV', value: data.summary.aov },
        { label: 'Cost coverage %', value: data.summary.costCoveragePct },
      ],
    },
    {
      sheet: 'Periods',
      columns: [
        { header: 'Period', getValue: (row: any) => row.label },
        { header: 'Invoices', getValue: (row: any) => row.invoiceCount },
        { header: 'Items sold', getValue: (row: any) => row.itemsSold },
        { header: 'Net sales', getValue: (row: any) => row.netSales },
        { header: 'COGS', getValue: (row: any) => row.cogs },
        { header: 'Gross profit', getValue: (row: any) => row.grossProfit },
        { header: 'Profit %', getValue: (row: any) => row.grossMarginPct },
        { header: 'AOV', getValue: (row: any) => row.aov },
        { header: 'Net profit', getValue: (row: any) => row.netProfit },
      ],
      rows: data.series,
    },
    {
      sheet: 'Daily Margins',
      columns: [
        { header: 'Date', getValue: (row: any) => row.label },
        { header: 'Invoices', getValue: (row: any) => row.invoiceCount },
        { header: 'Net revenue', getValue: (row: any) => row.netRevenue },
        { header: 'COGS', getValue: (row: any) => row.cogs },
        { header: 'Gross profit', getValue: (row: any) => row.grossProfit },
        { header: 'Profit %', getValue: (row: any) => row.profitPct },
        { header: 'Best margin invoice', getValue: (row: any) => row.bestMarginInvoiceNumber },
        { header: 'Margin change %', getValue: (row: any) => row.marginChangePct },
      ],
      rows: data.dailyMargins,
    },
    {
      sheet: 'Invoices',
      columns: [
        { header: 'Invoice #', getValue: (row: any) => row.invoiceNumber },
        { header: 'Date', getValue: (row: any) => formatDate(row.invoiceDate) },
        { header: 'Customer', getValue: (row: any) => row.customerName },
        { header: 'Status', getValue: (row: any) => row.status },
        { header: 'Net sales', getValue: (row: any) => row.netSales },
        { header: 'COGS', getValue: (row: any) => row.cogs },
        { header: 'Gross profit', getValue: (row: any) => row.grossProfit },
        { header: 'Margin %', getValue: (row: any) => row.grossMarginPct },
      ],
      rows: data.invoices,
    },
    {
      sheet: 'Top Products',
      columns: [
        { header: 'Product', getValue: (row: any) => row.productName },
        { header: 'SKU', getValue: (row: any) => row.skuCode },
        { header: 'Invoices', getValue: (row: any) => row.invoiceCount },
        { header: 'Units sold', getValue: (row: any) => row.unitsSold },
        { header: 'Revenue', getValue: (row: any) => row.revenue },
        { header: 'Profit', getValue: (row: any) => row.profit },
        { header: 'Margin %', getValue: (row: any) => row.marginPct },
      ],
      rows: data.topProducts,
    },
    {
      sheet: 'Top Customers',
      columns: [
        { header: 'Customer', getValue: (row: any) => row.name },
        { header: 'Orders', getValue: (row: any) => row.orderCount },
        { header: 'Total spend', getValue: (row: any) => row.totalSpend },
        { header: 'AOV', getValue: (row: any) => row.aov },
        { header: 'Profit', getValue: (row: any) => row.profit },
        { header: 'Margin %', getValue: (row: any) => row.avgMarginPct },
        { header: 'LTV', getValue: (row: any) => row.ltv },
        { header: 'Last purchase', getValue: (row: any) => formatDate(row.lastPurchaseDate) },
      ],
      rows: data.topCustomers,
    },
  ]
  await exportToExcel(safeFileName(filename), blocks)
}

export function printReport() {
  window.print()
}
