/** Normalized attribute used to build a readable, distinct SKU base. */
export type SkuAttribute = {
  code?: string | null
  name?: string | null
  value?: string | null
}

// Common three-letter shade codes. Values not listed here fall back to the
// first three alphanumeric characters of the normalized value.
const COLOR_CODES: Record<string, string> = {
  grey: 'GRY',
  gray: 'GRY',
  red: 'RED',
  pink: 'PNK',
  white: 'WHT',
  black: 'BLK',
  blue: 'BLU',
  green: 'GRN',
  yellow: 'YEL',
  beige: 'BEG',
  brown: 'BRN',
  gold: 'GLD',
  silver: 'SLV',
  marble: 'MBL',
  cream: 'CRM',
  creme: 'CRM',
  peach: 'PCH',
  orange: 'ORG',
  purple: 'PUR',
  violet: 'VIO',
  teal: 'TEL',
  bronze: 'BRZ',
}

const COLOR_LABELS = ['color', 'colour', 'shade', 'tone']
const FINISH_LABELS = ['finish', 'surface', 'texture', 'polish', 'style', 'variant', 'type']

export function normalizeSkuToken(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function shortToken(value: string, maxLength = 3): string {
  return normalizeSkuToken(value).slice(0, maxLength)
}

/** Code for an attribute value, e.g. Grey -> GRY, Polished -> POL. */
export function attributeCode(value: string): string {
  const key = normalizeSkuToken(value).toLowerCase()
  return COLOR_CODES[key] ?? shortToken(value)
}

function hasLabel(label: string, words: string[]): boolean {
  const normalized = normalizeSkuToken(label).toLowerCase()
  return words.some((word) => normalized.includes(word))
}

function hashToken(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(-4)
}

/**
 * Build the structured part of a SKU from the product name and its variant
 * attributes: series, shade/colour, finish and any remaining tokens.
 *
 * "Paradiso Grey" + { finish: "Polished" } -> "PAR-GRY-POL"
 * "Paradiso Red"  + { finish: "Polished" } -> "PAR-RED-POL"
 * "Paradiso Pink" + { finish: "Polished" } -> "PAR-PNK-POL"
 *
 * A short hash is only added when there is no attribute or colour token at
 * all, so products that share the same first three letters still diverge.
 */
export function buildSkuBase(productName: string, attributes: SkuAttribute[] = []): string {
  const nameWords = productName.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const series = shortToken(nameWords[0] ?? productName) || 'PRD'

  let color = ''
  let finish = ''
  const extras: string[] = []

  const addExtra = (code: string) => {
    if (code && code !== color && code !== finish && !extras.includes(code)) extras.push(code)
  }

  for (const attribute of attributes) {
    const value = attribute.value?.trim() ?? ''
    if (!value) continue
    const code = attributeCode(value)
    const label = `${attribute.code ?? ''} ${attribute.name ?? ''}`

    if (hasLabel(label, COLOR_LABELS) || (!color && COLOR_CODES[normalizeSkuToken(value).toLowerCase()])) {
      if (!color) color = code
      continue
    }

    if (hasLabel(label, FINISH_LABELS)) {
      if (!finish) finish = code
      else addExtra(code)
      continue
    }

    addExtra(code)
  }

  for (const word of nameWords.slice(1)) {
    const key = normalizeSkuToken(word).toLowerCase()
    if (COLOR_CODES[key]) {
      if (!color) color = COLOR_CODES[key]
      continue
    }
    addExtra(shortToken(word))
  }

  if (!finish && extras.length > 0) {
    finish = extras.shift()!
  }

  const parts = [series, color, finish, ...extras]
  if (!color && !finish && extras.length === 0) {
    parts.push(
      hashToken(`${productName}|${attributes.map((attribute) => attribute.value ?? '').join('|')}`),
    )
  }

  return parts.join('-')
}

export function formatSku(base: string, sequence: number): string {
  return `${base}-${String(Math.max(1, Math.trunc(sequence))).padStart(3, '0')}`
}

/** Highest used sequence for a base + 1, ignoring SKUs with other bases. */
export function nextSkuSequence(base: string, existingSkus: Iterable<string>): number {
  const prefix = `${base}-`
  let highest = 0
  for (const sku of existingSkus) {
    if (!sku.startsWith(prefix)) continue
    const suffix = sku.slice(prefix.length)
    if (/^\d+$/.test(suffix)) highest = Math.max(highest, Number(suffix))
  }
  return highest + 1
}
