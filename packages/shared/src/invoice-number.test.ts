import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_INVOICE_NUMBER_SETTINGS,
  formatInvoiceNumber,
  nextInvoiceNumber,
  nextSequenceForScope,
  type InvoiceNumberSettings,
} from './invoice-number'

const settings: InvoiceNumberSettings = {
  ...DEFAULT_INVOICE_NUMBER_SETTINGS,
  normalCurrentNumber: 120,
  gstCurrentNumber: 74,
}

describe('invoice numbering', () => {
  test('uses independent counters for normal and GST invoices', () => {
    expect(nextInvoiceNumber(settings, 'normal')).toBe('inv/121')
    expect(nextInvoiceNumber(settings, 'gst')).toBe('inv/2627/075')
  })

  test('current number is the last used number, not the next one', () => {
    expect(nextSequenceForScope(settings, 'normal')).toBe(121)
    expect(nextSequenceForScope(settings, 'gst')).toBe(75)
  })

  test('honours configured prefixes and padding', () => {
    expect(formatInvoiceNumber('inv/2627/', 5, 4)).toBe('inv/2627/0005')
    expect(formatInvoiceNumber('bill-', 12, 2)).toBe('bill-12')
  })

  test('falls back safely to zero for invalid counters or padding', () => {
    expect(nextInvoiceNumber({ ...settings, gstCurrentNumber: -5, paddingDigits: 0 }, 'gst')).toBe('inv/2627/001')
  })
})
