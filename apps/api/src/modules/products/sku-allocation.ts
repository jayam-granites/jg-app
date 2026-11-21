import { Prisma } from '@prisma/client'
import {
  buildSkuBase,
  formatSku,
  nextSkuSequence,
  type SkuAttribute,
} from '@jg-app/shared'
import { ConflictError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'

type SkuVariantInput = {
  id?: number
  skuCode?: string | null
  attributes?: { attributeId: number; attributeValueId: number }[] | null
}

// Legacy generator output: a 2-5 character name prefix plus a sequence.
// These are regenerated from attributes so products sharing a prefix diverge.
const LEGACY_GENERATED_SKU = /^[A-Z0-9]{2,5}-\d{2,}$/
const MAX_SKU_ATTEMPTS = 10

/** Injected in tests; the production implementation reads the variants table. */
export type SkuStore = {
  findExistingSkus(prefixes: string[]): Promise<string[]>
}

const prismaSkuStore: SkuStore = {
  async findExistingSkus(prefixes) {
    const rows = await prisma.productVariant.findMany({
      where: { OR: prefixes.map((prefix) => ({ skuCode: { startsWith: prefix } })) },
      select: { skuCode: true },
    })
    return rows.map((row) => row.skuCode)
  },
}

type Allocation = {
  productName: string
  variants: SkuVariantInput[]
  attributes: SkuAttribute[][]
  reserved: Set<string>
  store?: SkuStore
}

export function isSkuUniqueError(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false
  }
  const target = (error.meta as { target?: unknown } | undefined)?.target
  const fields = Array.isArray(target) ? target : typeof target === 'string' ? target.split(',') : []
  // Some adapters omit `meta.target`; the SKU is the only user-supplied unique
  // field in this write path, so retry rather than surface a spurious 409.
  return fields.length === 0 || fields.some((field) => /sku/i.test(String(field)))
}

/** Load the attribute code/name and value needed to build a structured SKU. */
export async function loadSkuAttributes(variants: SkuVariantInput[]): Promise<SkuAttribute[][]> {
  const attributeIds = [
    ...new Set(variants.flatMap((variant) => variant.attributes?.map((a) => a.attributeId) ?? [])),
  ]
  const valueIds = [
    ...new Set(variants.flatMap((variant) => variant.attributes?.map((a) => a.attributeValueId) ?? [])),
  ]

  const [attributes, values] = await Promise.all([
    prisma.attribute.findMany({
      where: { id: { in: attributeIds } },
      select: { id: true, code: true, name: true },
    }),
    prisma.attributeValue.findMany({
      where: { id: { in: valueIds } },
      select: { id: true, value: true },
    }),
  ])

  const attributeMap = new Map(attributes.map((attribute) => [attribute.id, attribute]))
  const valueMap = new Map(values.map((value) => [value.id, value]))

  return variants.map((variant) =>
    (variant.attributes ?? []).map((attribute) => ({
      code: attributeMap.get(attribute.attributeId)?.code ?? null,
      name: attributeMap.get(attribute.attributeId)?.name ?? null,
      value: valueMap.get(attribute.attributeValueId)?.value ?? null,
    })),
  )
}

/** True when an SKU is just a base plus a sequence (generated, not bespoke). */
function isGeneratedSku(sku: string, base: string): boolean {
  const prefix = `${base}-`
  if (!sku.startsWith(prefix)) return false
  return /^\d{3,}$/.test(sku.slice(prefix.length))
}

function shouldGenerate(variant: SkuVariantInput): boolean {
  const sku = variant.skuCode?.trim()
  if (!sku) return true
  // Existing rows keep their stored SKU on update.
  if (variant.id) return false
  // Old first-3-characters SKUs are replaced with the structured format.
  return LEGACY_GENERATED_SKU.test(sku)
}

/**
 * Allocate SKUs for every variant. Existing SKUs are read from the database,
 * combined with candidates attempted by earlier retries, and the sequence is
 * advanced until every candidate is free.
 */
export async function allocateVariantSkus({
  productName,
  variants,
  attributes,
  reserved,
  store = prismaSkuStore,
}: Allocation): Promise<{ skus: string[]; generated: string[] }> {
  const bases = variants.map((_, index) => buildSkuBase(productName, attributes[index] ?? []))

  const needsGeneration = variants.map((variant, index) => {
    const sku = variant.skuCode?.trim()
    if (shouldGenerate(variant)) return true
    // SKUs emitted by the form's generator are provisional. Recompute their
    // sequence against the database instead of trusting the client's counter.
    if (sku && isGeneratedSku(sku, bases[index])) return true
    return !!sku && reserved.has(sku)
  })

  // Two variants in one payload cannot share a manual SKU.
  const seen = new Set<string>()
  variants.forEach((variant, index) => {
    const sku = variant.skuCode?.trim()
    if (!sku || needsGeneration[index]) return
    if (seen.has(sku)) needsGeneration[index] = true
    else seen.add(sku)
  })

  const basesToCheck = [
    ...new Set(bases.filter((_, index) => needsGeneration[index])),
  ]
  const existing = basesToCheck.length
    ? await store.findExistingSkus(basesToCheck.map((base) => `${base}-`))
    : []

  const used = new Set<string>([...existing, ...reserved])
  variants.forEach((variant, index) => {
    const sku = variant.skuCode?.trim()
    if (sku && !needsGeneration[index]) used.add(sku)
  })

  const generated: string[] = []
  const skus = variants.map((variant, index) => {
    const sku = variant.skuCode?.trim()
    if (sku && !needsGeneration[index]) return sku

    let sequence = nextSkuSequence(bases[index], used)
    let candidate = formatSku(bases[index], sequence)
    while (used.has(candidate)) {
      sequence += 1
      candidate = formatSku(bases[index], sequence)
    }
    used.add(candidate)
    generated.push(candidate)
    return candidate
  })

  return { skus, generated }
}

/**
 * Retry a write when another request wins the race for the same SKU. Each
 * failed attempt's SKUs are reserved so the next attempt advances its sequence.
 */
export async function withSkuRetry<T>(
  operation: (reserved: Set<string>, record: (skus: string[]) => void) => Promise<T>,
  maxAttempts = MAX_SKU_ATTEMPTS,
): Promise<T> {
  const reserved = new Set<string>()

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let attempted: string[] = []
    try {
      return await operation(reserved, (skus) => {
        attempted = skus
      })
    } catch (error) {
      attempted.forEach((sku) => reserved.add(sku))
      if (!isSkuUniqueError(error)) throw error
      if (attempt === maxAttempts - 1) {
        throw new ConflictError('Could not allocate a unique SKU after several attempts')
      }
    }
  }

  throw new ConflictError('Could not allocate a unique SKU')
}
