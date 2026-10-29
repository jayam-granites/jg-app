export const INVOICE_NUMBER_PREFIX = 'INV'

export function financialYearCode(date: Date): string {
  const startYear = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1
  const endYear = startYear + 1
  return `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`
}

export function invoiceNumberPrefix(date: Date): string {
  return `${INVOICE_NUMBER_PREFIX}/${financialYearCode(date)}/`
}

export function formatInvoiceNumber(date: Date, sequence: number): string {
  return `${invoiceNumberPrefix(date)}${String(sequence).padStart(5, '0')}`
}

export function sequenceFromInvoiceNumber(invoiceNumber: string, prefix: string): number {
  if (!invoiceNumber.startsWith(prefix)) return 0
  const value = Number(invoiceNumber.slice(prefix.length))
  return Number.isInteger(value) && value > 0 ? value : 0
}
