/**
 * Serialises the read/increment of the two invoice counters. Held for the
 * duration of the transaction that also creates the invoice, so concurrent
 * requests can never be assigned the same number.
 */
export const INVOICE_NUMBER_LOCK_KEY = 'invoice_number_allocation'
