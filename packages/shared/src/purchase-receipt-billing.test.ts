import { describe, expect, it } from 'bun:test'
import { calculateReceiptBilling } from './purchase-receipt-billing'

describe('calculateReceiptBilling', () => {
  it('calculates one GST bill and cash portion for the overall receipt', () => {
    const result = calculateReceiptBilling({
      mode: 'OVERALL',
      lines: [{ subtotal: 100 }, { subtotal: 200 }],
      adjustment: 30,
      gstPercentage: 18,
      overallGstInvoiceSqft: 20,
      overallGstInvoiceRate: 5,
    })

    expect(result.summary.gstInvoiceBaseValue).toBe(100)
    expect(result.summary.gstInvoiceGst).toBe(18)
    expect(result.summary.gstInvoiceTotal).toBe(118)
    expect(result.summary.cashPortion).toBe(152)
    expect(result.lines.every((line) => line.cashPortion === null)).toBe(true)
  })

  it('calculates product bills and allocates adjustment so product cash totals match the receipt', () => {
    const result = calculateReceiptBilling({
      mode: 'PRODUCT',
      lines: [
        { subtotal: 100, gstInvoiceSqft: 10, gstInvoiceRate: 5 },
        { subtotal: 200, gstInvoiceSqft: 5, gstInvoiceRate: 10 },
      ],
      adjustment: 30,
      gstPercentage: 18,
    })

    expect(result.summary.gstInvoiceSqft).toBe(15)
    expect(result.summary.gstInvoiceRate).toBeNull()
    expect(result.summary.gstInvoiceBaseValue).toBe(100)
    expect(result.summary.gstInvoiceGst).toBe(18)
    expect(result.summary.gstInvoiceTotal).toBe(118)
    expect(result.lines.map((line) => line.cashPortion)).toEqual([31, 121])
    expect(result.lines.reduce((sum, line) => sum + (line.cashPortion ?? 0), 0)).toBe(result.summary.cashPortion)
  })
})
