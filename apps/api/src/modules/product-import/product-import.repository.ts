import { Prisma, type ProductImportJob as PrismaProductImportJob } from '@prisma/client'
import type {
  ProductImportJob,
  ProductImportPhase,
  ProductImportPreview,
  ProductImportResult,
  ProductImportStatus,
} from '@jg-app/shared'
import { prisma } from '#/lib/prisma'

const STATUSES: readonly ProductImportStatus[] = [
  'queued',
  'validating',
  'preview_ready',
  'validation_failed',
  'committing',
  'completed',
  'failed',
]

export type CreateProductImportJobInput = {
  jobId: string
  fileName: string
  fileBytes: Uint8Array
  requestedById: string
  status?: ProductImportStatus
  phase?: ProductImportPhase
}

export type UpdateProductImportJobInput = {
  status?: ProductImportStatus
  phase?: ProductImportPhase
  progress?: number
  totalRows?: number
  processedRows?: number
  preview?: ProductImportPreview | null
  result?: ProductImportResult | null
  error?: ProductImportJob['error']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toStatus(value: string): ProductImportStatus {
  return STATUSES.includes(value as ProductImportStatus) ? (value as ProductImportStatus) : 'failed'
}

function toPhase(value: string | null): ProductImportPhase {
  return value === 'validate' || value === 'commit' ? value : null
}

function toPreview(value: Prisma.JsonValue | null): ProductImportPreview | null {
  if (value === null || !isRecord(value)) return null
  return value as unknown as ProductImportPreview
}

function toResult(value: Prisma.JsonValue | null): ProductImportResult | null {
  if (value === null || !isRecord(value)) return null
  return value as unknown as ProductImportResult
}

function toError(value: Prisma.JsonValue | null): ProductImportJob['error'] {
  if (value === null || !isRecord(value)) return null
  return value as unknown as NonNullable<ProductImportJob['error']>
}

function toJsonValue(
  value: ProductImportPreview | ProductImportResult | ProductImportJob['error'],
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput {
  return value === null ? Prisma.DbNull : (value as unknown as Prisma.InputJsonValue)
}

function mapJob(row: PrismaProductImportJob): ProductImportJob {
  return {
    id: row.id,
    jobId: row.jobId,
    status: toStatus(row.status),
    phase: toPhase(row.phase),
    progress: row.progress,
    totalRows: row.totalRows,
    processedRows: row.processedRows,
    fileName: row.fileName,
    preview: toPreview(row.preview),
    result: toResult(row.result),
    error: toError(row.error),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export const productImportRepository = {
  async create(input: CreateProductImportJobInput): Promise<ProductImportJob> {
    const row = await prisma.productImportJob.create({
      data: {
        jobId: input.jobId,
        fileName: input.fileName,
        fileBytes: input.fileBytes as Uint8Array<ArrayBuffer>,
        requestedById: input.requestedById,
        status: input.status ?? 'queued',
        phase: input.phase ?? null,
      },
    })
    return mapJob(row)
  },

  async findByJobId(jobId: string): Promise<ProductImportJob | null> {
    const row = await prisma.productImportJob.findUnique({ where: { jobId } })
    return row ? mapJob(row) : null
  },

  async findById(id: number): Promise<ProductImportJob | null> {
    const row = await prisma.productImportJob.findUnique({ where: { id } })
    return row ? mapJob(row) : null
  },

  async getFileBytes(id: number): Promise<Buffer | null> {
    const row = await prisma.productImportJob.findUnique({
      where: { id },
      select: { fileBytes: true },
    })
    return row?.fileBytes ? Buffer.from(row.fileBytes) : null
  },

  async update(id: number, input: UpdateProductImportJobInput): Promise<ProductImportJob> {
    const data: Prisma.ProductImportJobUpdateInput = {}

    if (input.status !== undefined) data.status = input.status
    if (input.phase !== undefined) data.phase = input.phase
    if (input.progress !== undefined) data.progress = input.progress
    if (input.totalRows !== undefined) data.totalRows = input.totalRows
    if (input.processedRows !== undefined) data.processedRows = input.processedRows
    if (input.preview !== undefined) data.preview = toJsonValue(input.preview)
    if (input.result !== undefined) data.result = toJsonValue(input.result)
    if (input.error !== undefined) data.error = toJsonValue(input.error)

    const row = await prisma.productImportJob.update({ where: { id }, data })
    return mapJob(row)
  },

  async markProgress(id: number, processedRows: number, groupCount: number): Promise<void> {
    const progress =
      groupCount > 0 ? Math.min(100, Math.max(0, Math.round((processedRows / groupCount) * 100))) : 0
    await prisma.productImportJob.update({
      where: { id },
      data: { processedRows, progress },
    })
  },
}
