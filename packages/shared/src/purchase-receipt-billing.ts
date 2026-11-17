export type GstCalculationMode = 'OVERALL' | 'PRODUCT'

export type ReceiptBillingLineInput = {
  subtotal: number
  gstInvoiceSqft?: number
  gstInvoiceRate?: number
}

export type ReceiptBillingLine = {
  gstInvoiceSqft: number | null
  gstInvoiceRate: number | null
  gstInvoiceBaseValue: number | null
  gstInvoiceGst: number | null
  gstInvoiceTotal: number | null
  cashPortion: number | null
}

export type ReceiptBillingSummary = ReceiptBillingLine & {
  gstCalculationMode: GstCalculationMode
  gstPercentage: number
  netTotal: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

export function calculateReceiptBilling(input: {
  mode: GstCalculationMode
  lines: ReceiptBillingLineInput[]
  adjustment: number
  gstPercentage: number
  overallGstInvoiceSqft?: number
  overallGstInvoiceRate?: number
}): { summary: ReceiptBillingSummary; lines: ReceiptBillingLine[] } {
  const subtotal = round2(input.lines.reduce((sum, line) => sum + line.subtotal, 0))
  const netTotal = round2(subtotal - input.adjustment)

  if (input.mode === 'OVERALL') {
    const sqft = input.overallGstInvoiceSqft ?? 0
    const rate = input.overallGstInvoiceRate ?? 0
    const baseValue = sqft > 0 && rate > 0 ? round2(sqft * rate) : 0
    const gst = round2(baseValue * input.gstPercentage / 100)
    const invoiceTotal = round2(baseValue + gst)

    return {
      summary: {
        gstCalculationMode: input.mode,
        gstPercentage: input.gstPercentage,
        netTotal,
        gstInvoiceSqft: sqft || null,
        gstInvoiceRate: rate || null,
        gstInvoiceBaseValue: baseValue,
        gstInvoiceGst: gst,
        gstInvoiceTotal: invoiceTotal,
        cashPortion: round2(netTotal - invoiceTotal),
      },
      lines: input.lines.map(() => ({
        gstInvoiceSqft: null,
        gstInvoiceRate: null,
        gstInvoiceBaseValue: null,
        gstInvoiceGst: null,
        gstInvoiceTotal: null,
        cashPortion: null,
      })),
    }
  }

  let allocatedAdjustment = 0
  const invoiceLines = input.lines.map((line, index) => {
    const sqft = line.gstInvoiceSqft ?? 0
    const rate = line.gstInvoiceRate ?? 0
    const baseValue = sqft > 0 && rate > 0 ? round2(sqft * rate) : 0
    const gst = round2(baseValue * input.gstPercentage / 100)
    const invoiceTotal = round2(baseValue + gst)
    const isLast = index === input.lines.length - 1
    const adjustmentShare = isLast
      ? round2(input.adjustment - allocatedAdjustment)
      : subtotal > 0
        ? round2(input.adjustment * line.subtotal / subtotal)
        : 0
    allocatedAdjustment = round2(allocatedAdjustment + adjustmentShare)

    return {
      sqft,
      rate,
      baseValue,
      gst,
      invoiceTotal,
      cashPortion: round2(line.subtotal - adjustmentShare - invoiceTotal),
    }
  })

  const totalBaseValue = round2(invoiceLines.reduce((sum, line) => sum + line.baseValue, 0))
  const totalGst = round2(invoiceLines.reduce((sum, line) => sum + line.gst, 0))
  const totalInvoice = round2(invoiceLines.reduce((sum, line) => sum + line.invoiceTotal, 0))
  const totalCash = round2(invoiceLines.reduce((sum, line) => sum + line.cashPortion, 0))
  const totalSqft = round3(invoiceLines.reduce((sum, line) => sum + line.sqft, 0))

  return {
    summary: {
      gstCalculationMode: input.mode,
      gstPercentage: input.gstPercentage,
      netTotal,
      gstInvoiceSqft: totalSqft || null,
      gstInvoiceRate: null,
      gstInvoiceBaseValue: totalBaseValue,
      gstInvoiceGst: totalGst,
      gstInvoiceTotal: totalInvoice,
      cashPortion: totalCash,
    },
    lines: invoiceLines.map((line) => ({
      gstInvoiceSqft: line.sqft || null,
      gstInvoiceRate: line.rate || null,
      gstInvoiceBaseValue: line.baseValue,
      gstInvoiceGst: line.gst,
      gstInvoiceTotal: line.invoiceTotal,
      cashPortion: line.cashPortion,
    })),
  }
}
