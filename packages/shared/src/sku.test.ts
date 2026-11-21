import { describe, expect, it } from 'bun:test'
import { attributeCode, buildSkuBase, formatSku, nextSkuSequence } from './sku'

const polished = [{ code: 'finish', name: 'Finish', value: 'Polished' }]

describe('buildSkuBase', () => {
  it('distinguishes Paradiso Grey, Red and Pink by normalized attributes', () => {
    const grey = buildSkuBase('Paradiso Grey', polished)
    const red = buildSkuBase('Paradiso Red', polished)
    const pink = buildSkuBase('Paradiso Pink', polished)

    expect(grey).toBe('PAR-GRY-POL')
    expect(red).toBe('PAR-RED-POL')
    expect(pink).toBe('PAR-PNK-POL')
    expect(new Set([grey, red, pink]).size).toBe(3)
  })

  it('reads colour from attributes when the product name has no shade', () => {
    expect(
      buildSkuBase('Paradiso', [
        { code: 'color', name: 'Colour', value: 'Grey' },
        ...polished,
      ]),
    ).toBe('PAR-GRY-POL')
  })

  it('does not collapse unrelated finishes to the same prefix', () => {
    expect(buildSkuBase('Paradiso Grey', [{ value: 'Honed' }])).toBe('PAR-GRY-HON')
    expect(buildSkuBase('Paradiso Grey', [{ value: 'Polished' }])).toBe('PAR-GRY-POL')
  })

  it('uses a product token when neither colour nor finish attributes exist', () => {
    const standalone = buildSkuBase('Paradiso')
    const other = buildSkuBase('Pinnacle')
    expect(standalone).toMatch(/^PAR-/)
    expect(standalone).not.toBe(other)
  })

  it('normalizes punctuation, case and accents', () => {
    expect(attributeCode('Crème')).toBe('CRM')
    expect(buildSkuBase('  paradiso  gray ', [{ value: 'POLISHED' }])).toBe('PAR-GRY-POL')
  })
})

describe('formatSku / nextSkuSequence', () => {
  it('pads the sequence and keeps bases scoped', () => {
    expect(formatSku('PAR-GRY-POL', 1)).toBe('PAR-GRY-POL-001')
    expect(formatSku('PAR-GRY-POL', 12)).toBe('PAR-GRY-POL-012')

    const existing = [
      'PAR-GRY-POL-001',
      'PAR-GRY-POL-004',
      'PAR-RED-POL-001',
      'PAR-GRY-POL-OLD',
      'XPAR-GRY-POL-009',
    ]
    expect(nextSkuSequence('PAR-GRY-POL', existing)).toBe(5)
    expect(nextSkuSequence('PAR-RED-POL', existing)).toBe(2)
    expect(nextSkuSequence('PAR-PNK-POL', existing)).toBe(1)
  })
})
