export type InvoiceNumberScope = 'normal' | 'gst'

export type InvoiceNumberSettings = {
  normalPrefix: string
  normalCurrentNumber: number
  gstPrefix: string
  gstCurrentNumber: number
  paddingDigits: number
}

export const DEFAULT_INVOICE_NUMBER_SETTINGS: InvoiceNumberSettings = {
  normalPrefix: 'inv/',
  normalCurrentNumber: 0,
  gstPrefix: 'inv/2627/',
  gstCurrentNumber: 0,
  paddingDigits: 3,
}

export function currentNumberForScope(settings: InvoiceNumberSettings, scope: InvoiceNumberScope): number {
  return scope === 'gst' ? settings.gstCurrentNumber : settings.normalCurrentNumber
}

export function prefixForScope(settings: InvoiceNumberSettings, scope: InvoiceNumberScope): string {
  return scope === 'gst' ? settings.gstPrefix : settings.normalPrefix
}

export function nextSequenceForScope(settings: InvoiceNumberSettings, scope: InvoiceNumberScope): number {
  const current = currentNumberForScope(settings, scope)
  return (Number.isInteger(current) && current > 0 ? current : 0) + 1
}

/** Formats an already-resolved sequence number, e.g. `inv/2627/075`. */
export function formatInvoiceNumber(prefix: string, sequence: number, paddingDigits: number): string {
  const padding = Number.isInteger(paddingDigits) && paddingDigits > 0 ? Math.min(paddingDigits, 12) : 3
  return `${prefix}${String(sequence).padStart(padding, '0')}`
}

/** The number that will be assigned to the next invoice of this type. */
export function nextInvoiceNumber(settings: InvoiceNumberSettings, scope: InvoiceNumberScope): string {
  return formatInvoiceNumber(
    prefixForScope(settings, scope),
    nextSequenceForScope(settings, scope),
    settings.paddingDigits,
  )
}
