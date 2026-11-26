import { randomUUID } from 'node:crypto'
import { PgBoss } from 'pg-boss'
import type {
  ProductImportPayload,
  ProductImportPreview,
  ProductImportPreviewRow,
  ProductImportResult,
  ProductImportTemplateData,
} from '@jg-app/shared'
import { env } from '#/config/env'
import { ValidationError } from '#/lib/errors'
import { logger } from '#/lib/logger'
import { prisma } from '#/lib/prisma'
import { allocateVariantSkus, loadSkuAttributes, withSkuRetry } from '../products/sku-allocation'
import {
  buildProductImportTemplate,
  getProductImportTemplateData,
  parseProductImportWorkbook,
} from './product-import.excel'
import { productImportRepository } from './product-import.repository'

export const PRODUCT_IMPORT_VALIDATE_QUEUE = 'products.bulk-import.validate'
export const PRODUCT_IMPORT_COMMIT_QUEUE = 'products.bulk-import.commit'

export const PRODUCT_IMPORT_QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 5,
  retryBackoff: true,
  expireInSeconds: 3600,
} as const

const MAX_WORKBOOK_BYTES = 9 * 1024 * 1024

type ImportPreviewRow = ProductImportPreviewRow & {
  description?: string | null
  widthReduction?: number | string | null
}

type ImportLookups = {
  categoryIds: Map<string, number>
  unitIds: Map<string, number>
  attributeIds: Map<string, number>
  attributeValueIds: Map<string, number>
}

type ImportAttribute = { attributeId: number; attributeValueId: number }

type DraftVariant = {
  sourceRow: ProductImportPreviewRow
  skuCode: string | null
  unitId: number
  attributes: ImportAttribute[]
  mrp: number
  sellingPrice: number
  sellingPriceFrom: number | null
  gstPercent: number | null
  costPrice: number
  openingStock: number
  batchNo: string
}

type DraftGroup = {
  groupCode: string
  productName: string
  categoryId: number
  hsnCode: string | null
  lotNumber: string | null
  description: string | null
  widthReduction: number
  variants: DraftVariant[]
}

type PreparedGroup = DraftGroup & {
  skus: string[]
  generatedSkus: string[]
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function normalizeLookup(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function decodeWorkbook(fileBase64: string): Buffer {
  const dataUri = /^data:[^;,]+;base64,([\s\S]*)$/.exec(fileBase64.trim())
  const encoded = (dataUri?.[1] ?? fileBase64).replace(/\s+/g, '')

  if (
    !encoded ||
    encoded.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
  ) {
    throw new ValidationError('Uploaded file is not valid base64 data')
  }

  const buffer = Buffer.from(encoded, 'base64')
  if (buffer.byteLength === 0) throw new ValidationError('Excel file is empty')
  if (buffer.byteLength > MAX_WORKBOOK_BYTES) {
    throw new ValidationError('Excel file must be smaller than 9 MB')
  }
  return buffer
}

/**
 * The HTTP process does not necessarily run the scheduled workers, so it needs
 * its own started pg-boss instance. A short-lived instance also avoids stale
 * pooled sockets when the API runs in an isolated Worker.
 */
async function sendImportJob(queue: string, payload: ProductImportPayload): Promise<void> {
  const boss = new PgBoss(env.databaseUrl)
  boss.on('error', (error: Error) => {
    logger.error({ err: error }, 'pg-boss product import sender error')
  })

  try {
    await boss.start()
    await boss.createQueue(PRODUCT_IMPORT_VALIDATE_QUEUE, PRODUCT_IMPORT_QUEUE_OPTIONS)
    await boss.createQueue(PRODUCT_IMPORT_COMMIT_QUEUE, PRODUCT_IMPORT_QUEUE_OPTIONS)
    await boss.send(queue, payload)
  } finally {
    try {
      await boss.stop()
    } catch (error) {
      logger.error({ err: error }, 'Failed to stop pg-boss product import sender')
    }
  }
}

async function loadImportLookups(): Promise<ImportLookups> {
  const [categories, units, attributes, values] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    }),
    prisma.unit.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.attribute.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    }),
    prisma.attributeValue.findMany({
      where: { isActive: true },
      select: { id: true, attributeId: true, value: true },
    }),
  ])

  const categoryIds = new Map<string, number>()
  for (const category of categories) {
    const key = normalizeLookup(category.name)
    if (key && !categoryIds.has(key)) categoryIds.set(key, category.id)
  }

  const unitIds = new Map<string, number>()
  for (const unit of units) {
    for (const key of [normalizeLookup(unit.code), normalizeLookup(unit.name)]) {
      if (key && !unitIds.has(key)) unitIds.set(key, unit.id)
    }
  }

  const attributeIds = new Map<string, number>()
  for (const attribute of attributes) {
    for (const key of [normalizeLookup(attribute.code), normalizeLookup(attribute.name)]) {
      if (key && !attributeIds.has(key)) attributeIds.set(key, attribute.id)
    }
  }

  const attributeValueIds = new Map<string, number>()
  for (const value of values) {
    const key = `${value.attributeId}:${normalizeLookup(value.value)}`
    if (!attributeValueIds.has(key)) attributeValueIds.set(key, value.id)
  }

  return { categoryIds, unitIds, attributeIds, attributeValueIds }
}

function resolveAttributes(
  row: ProductImportPreviewRow,
  lookups: ImportLookups,
): ImportAttribute[] {
  const resolved = new Map<number, number>()

  for (const [codeOrName, value] of Object.entries(row.attributeValues ?? {})) {
    const attributeId = lookups.attributeIds.get(normalizeLookup(codeOrName))
    if (!attributeId) {
      throw new ValidationError(`Unknown attribute "${codeOrName}" (row ${row.row})`)
    }
    const valueId = lookups.attributeValueIds.get(`${attributeId}:${normalizeLookup(value)}`)
    if (!valueId) {
      throw new ValidationError(
        `Unknown attribute value "${value}" for "${codeOrName}" (row ${row.row})`,
      )
    }
    if (!resolved.has(attributeId)) resolved.set(attributeId, valueId)
  }

  return [...resolved].map(([attributeId, attributeValueId]) => ({ attributeId, attributeValueId }))
}

function groupRows(rows: ProductImportPreviewRow[]): Map<string, ProductImportPreviewRow[]> {
  const groups = new Map<string, ProductImportPreviewRow[]>()
  for (const row of rows) {
    const key = row.groupCode?.trim() || `row-${row.row}`
    const group = groups.get(key) ?? []
    group.push(row)
    groups.set(key, group)
  }
  return groups
}

function buildDraftGroups(
  preview: ProductImportPreview,
  lookups: ImportLookups,
  jobSuffix: string,
  dateStamp: string,
): DraftGroup[] {
  const drafts: DraftGroup[] = []
  let batchIndex = 0

  for (const [groupCode, rows] of groupRows(preview.rows as ImportPreviewRow[])) {
    const first = rows[0] as ImportPreviewRow
    const categoryId = lookups.categoryIds.get(normalizeLookup(first.category))
    if (!categoryId) {
      throw new ValidationError(`Unknown category "${first.category}" (row ${first.row})`)
    }

    const productName = first.productName.trim()
    if (!productName) throw new ValidationError(`Product name is missing (row ${first.row})`)

    const variants: DraftVariant[] = rows.map((row) => {
      const unitId = lookups.unitIds.get(normalizeLookup(row.unit))
      if (!unitId) throw new ValidationError(`Unknown unit "${row.unit}" (row ${row.row})`)

      const sellingPrice = row.sellingPrice ?? 0
      const costPrice = row.costPrice ?? 0
      const openingStock = row.openingStock ?? 0
      batchIndex += 1

      return {
        sourceRow: row,
        skuCode: row.skuCode,
        unitId,
        attributes: resolveAttributes(row, lookups),
        mrp: row.mrp ?? sellingPrice,
        sellingPrice,
        sellingPriceFrom: row.sellingPrice,
        gstPercent: row.taxGst,
        costPrice,
        openingStock,
        batchNo: `IMP-${dateStamp}-${jobSuffix}-${batchIndex}`,
      }
    })

    drafts.push({
      groupCode,
      productName,
      categoryId,
      hsnCode: first.hsnCode ?? null,
      lotNumber: first.lotNumber ?? null,
      description: first.description ?? null,
      widthReduction: toFiniteNumber(first.widthReduction) ?? 0,
      variants,
    })
  }

  return drafts
}

export async function generateTemplate(): Promise<ArrayBuffer> {
  const data: ProductImportTemplateData = await getProductImportTemplateData()
  return buildProductImportTemplate(data)
}

export async function enqueueValidation(input: {
  fileName: string
  fileBase64: string
  requestedById: string
}): Promise<{ jobId: string; statusUrl: string }> {
  const fileName = input.fileName.trim()
  if (!fileName.toLowerCase().endsWith('.xlsx')) {
    throw new ValidationError('Only .xlsx files are supported')
  }

  const fileBytes = decodeWorkbook(input.fileBase64)
  const jobId = randomUUID()
  const job = await productImportRepository.create({
    jobId,
    fileName,
    fileBytes,
    requestedById: input.requestedById,
    status: 'queued',
    phase: 'validate',
  })

  const payload: ProductImportPayload = {
    importJobId: job.id,
    jobId,
    requestedById: input.requestedById,
  }

  try {
    await sendImportJob(PRODUCT_IMPORT_VALIDATE_QUEUE, payload)
  } catch (error) {
    await productImportRepository.update(job.id, {
      status: 'failed',
      error: { message: errorMessage(error) },
    })
    throw error
  }

  return { jobId, statusUrl: `/api/products/import/jobs/${jobId}` }
}

export async function enqueueCommit(input: {
  jobId: string
  requestedById: string
}): Promise<{ jobId: string }> {
  const job = await productImportRepository.findByJobId(input.jobId)
  if (!job) throw new ValidationError('Import job not found')
  if (job.status !== 'preview_ready') {
    throw new ValidationError('Only jobs with a ready preview can be committed')
  }
  if (!job.preview || !Array.isArray(job.preview.errors) || job.preview.errors.length > 0) {
    throw new ValidationError('Import preview has validation errors or is unavailable')
  }

  await productImportRepository.update(job.id, {
    status: 'queued',
    phase: 'commit',
    progress: 0,
    processedRows: 0,
    error: null,
  })

  const payload: ProductImportPayload = {
    importJobId: job.id,
    jobId: job.jobId,
    requestedById: input.requestedById,
  }

  try {
    await sendImportJob(PRODUCT_IMPORT_COMMIT_QUEUE, payload)
  } catch (error) {
    await productImportRepository.update(job.id, {
      status: 'failed',
      error: { message: errorMessage(error) },
    })
    throw error
  }

  return { jobId: job.jobId }
}

export async function getJob(jobId: string) {
  return productImportRepository.findByJobId(jobId)
}

export async function runValidation(payload: ProductImportPayload): Promise<ProductImportPreview> {
  const job = await productImportRepository.findById(payload.importJobId)
  if (!job || job.jobId !== payload.jobId) throw new Error('Import job not found')

  await productImportRepository.update(job.id, {
    status: 'validating',
    phase: 'validate',
    progress: 0,
    processedRows: 0,
    preview: null,
    result: null,
    error: null,
  })

  try {
    const templateData = await getProductImportTemplateData()
    const fileBytes = await productImportRepository.getFileBytes(job.id)
    if (!fileBytes) throw new Error('Stored workbook not found')

    const preview = await parseProductImportWorkbook(fileBytes, templateData)
    await productImportRepository.update(job.id, {
      status: preview.errors.length === 0 ? 'preview_ready' : 'validation_failed',
      phase: 'validate',
      progress: 100,
      totalRows: preview.totalRows,
      processedRows: 0,
      preview,
      error: null,
    })
    return preview
  } catch (error) {
    await productImportRepository.update(job.id, {
      status: 'failed',
      error: { message: errorMessage(error) },
      progress: 100,
    })
    throw error
  }
}

export async function runCommit(payload: ProductImportPayload): Promise<ProductImportResult> {
  const job = await productImportRepository.findById(payload.importJobId)
  if (!job || job.jobId !== payload.jobId) throw new Error('Import job not found')

  await productImportRepository.update(job.id, {
    status: 'committing',
    phase: 'commit',
    progress: 0,
    processedRows: 0,
    error: null,
  })

  try {
    const preview = job.preview
    if (!preview) throw new ValidationError('Import job has no preview')
    if (!Array.isArray(preview.errors) || preview.errors.length > 0) {
      throw new ValidationError('Cannot commit an import with validation errors')
    }

    const lookups = await loadImportLookups()
    const dateStamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const jobSuffix = job.jobId.replace(/-/g, '').slice(0, 8) || String(job.id)
    const drafts = buildDraftGroups(preview, lookups, jobSuffix, dateStamp)
    if (drafts.length === 0) throw new ValidationError('Import preview contains no products')

    const skuVariants = drafts.flatMap((group) =>
      group.variants.map((variant) => ({
        skuCode: variant.skuCode,
        attributes: variant.attributes,
      })),
    )
    const skuAttributes = await loadSkuAttributes(skuVariants)

    const result = await withSkuRetry(async (reserved, record) => {
      const prepared: PreparedGroup[] = []
      let offset = 0

      for (const draft of drafts) {
        const variants = draft.variants.map((variant) => ({
          skuCode: variant.skuCode,
          attributes: variant.attributes,
        }))
        const attributes = skuAttributes.slice(offset, offset + variants.length)
        offset += variants.length

        const { skus, generated } = await allocateVariantSkus({
          productName: draft.productName,
          variants,
          attributes,
          reserved,
        })
        record(skus)
        prepared.push({ ...draft, skus, generatedSkus: generated })
      }

      return prisma.$transaction(async (tx) => {
        const productIds: number[] = []
        const generatedSkus: string[] = []
        let variantsCreated = 0
        let inventoryBatchesCreated = 0
        let processed = 0

        for (const group of prepared) {
          const product = await tx.product.create({
            data: {
              name: group.productName,
              categoryId: group.categoryId,
              description: group.description,
              hsnCode: group.hsnCode,
              lotNumber: group.lotNumber,
              widthReduction: group.widthReduction,
              isActive: true,
              variants: {
                create: group.variants.map((variant, index) => ({
                  skuCode: group.skus[index],
                  unitId: variant.unitId,
                  secondaryUnitId: null,
                  mrp: variant.mrp,
                  sellingPrice: variant.sellingPrice,
                  gstPercent: variant.gstPercent,
                  isActive: true,
                  attributes: variant.attributes.length
                    ? {
                        create: variant.attributes.map((attribute) => ({
                          attributeId: attribute.attributeId,
                          attributeValueId: attribute.attributeValueId,
                        })),
                      }
                    : undefined,
                  inventoryBatches: {
                    create: {
                      batchNo: variant.batchNo,
                      totalQty: variant.openingStock,
                      availableQty: variant.openingStock,
                      buyingPrice: variant.costPrice,
                      landingPrice: variant.costPrice,
                      sellingPriceFrom: variant.sellingPriceFrom,
                      remarks: `Imported via ${job.jobId}`,
                    },
                  },
                })),
              },
            },
            select: { id: true },
          })

          productIds.push(product.id)
          generatedSkus.push(...group.generatedSkus)
          variantsCreated += group.variants.length
          inventoryBatchesCreated += group.variants.length
          processed += 1

          // Deliberately use the non-transactional proxy so clients polling the
          // job can see progress while the import transaction is still open.
          await productImportRepository.markProgress(job.id, processed, prepared.length)
        }

        return {
          productsCreated: productIds.length,
          variantsCreated,
          inventoryBatchesCreated,
          productIds,
          generatedSkus,
        } satisfies ProductImportResult
      })
    })

    await productImportRepository.update(job.id, {
      status: 'completed',
      phase: 'commit',
      progress: 100,
      processedRows: drafts.length,
      result,
      error: null,
    })
    return result
  } catch (error) {
    await productImportRepository.update(job.id, {
      status: 'failed',
      phase: 'commit',
      error: { message: errorMessage(error) },
    })
    throw error
  }
}

export const productImportService = {
  generateTemplate,
  enqueueValidation,
  enqueueCommit,
  getJob,
  runValidation,
  runCommit,
}
