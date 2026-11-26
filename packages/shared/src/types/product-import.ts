export type ProductImportStatus =
  | 'queued'
  | 'validating'
  | 'preview_ready'
  | 'validation_failed'
  | 'committing'
  | 'completed'
  | 'failed'

export type ProductImportPhase = 'validate' | 'commit' | null

export type ProductImportIssue = {
  row: number
  column: string
  reason: string
  severity: 'error' | 'warning'
}

export type ProductImportPreviewRow = {
  row: number
  groupCode: string
  productName: string
  hasVariants: boolean
  category: string
  hsnCode: string | null
  lotNumber: string | null
  description: string | null
  widthReduction: number | null
  unit: string
  taxGst: number | null
  skuCode: string | null
  attributeValues: Record<string, string>
  costPrice: number | null
  sellingPrice: number | null
  mrp: number | null
  openingStock: number | null
  marginPct: number | null
  errors: ProductImportIssue[]
  warnings: ProductImportIssue[]
}

export type ProductImportPreview = {
  totalRows: number
  productCount: number
  variantCount: number
  rows: ProductImportPreviewRow[]
  errors: ProductImportIssue[]
  warnings: ProductImportIssue[]
  canCommit: boolean
}

export type ProductImportResult = {
  productsCreated: number
  variantsCreated: number
  inventoryBatchesCreated: number
  productIds: number[]
  generatedSkus: string[]
}

export type ProductImportJob = {
  id: number
  jobId: string
  status: ProductImportStatus
  phase: ProductImportPhase
  progress: number
  totalRows: number
  processedRows: number
  fileName: string
  preview: ProductImportPreview | null
  result: ProductImportResult | null
  error: { message: string; details?: unknown } | null
  createdAt: string
  updatedAt: string
}

export type ProductImportTemplateAttribute = {
  code: string
  name: string
  values: string[]
}

export type ProductImportTemplateData = {
  categories: string[]
  units: string[]
  taxRates: number[]
  attributes: ProductImportTemplateAttribute[]
  generatedAt: string
}

export type ProductImportPayload = {
  importJobId: number
  jobId: string
  requestedById: string
}
