import { describe, expect, it } from 'bun:test'
import { normalizeImportCell, parseImportNumber } from './product-import.excel'

describe('normalizeImportCell', () => {
  it('trims cell values', () => {
    expect(normalizeImportCell('  Galaxy Black  ')).toBe('Galaxy Black')
  })

  it('treats NA placeholders as empty', () => {
    for (const value of ['', 'N/A', 'na', '-', '--', 'nil', 'None']) {
      expect(normalizeImportCell(value)).toBe('')
    }
  })

  it('stringifies primitive values', () => {
    expect(normalizeImportCell(18)).toBe('18')
    expect(normalizeImportCell(null)).toBe('')
    expect(normalizeImportCell(undefined)).toBe('')
  })
})

describe('parseImportNumber', () => {
  it('parses Indian-formatted currency values', () => {
    expect(parseImportNumber('₹1,200.50')).toBe(1200.5)
    expect(parseImportNumber(' 1 200 ')).toBe(1200)
  })

  it('parses plain numbers and numeric cells', () => {
    expect(parseImportNumber(1200.5)).toBe(1200.5)
    expect(parseImportNumber('18')).toBe(18)
  })

  it('returns null for empty or invalid values', () => {
    expect(parseImportNumber('N/A')).toBeNull()
    expect(parseImportNumber('abc')).toBeNull()
    expect(parseImportNumber(null)).toBeNull()
  })
})
