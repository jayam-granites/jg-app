import { useEffect, useState, type ChangeEvent, type ComponentProps } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Download, Loader2, UploadCloud } from 'lucide-react'
import type {
  ProductImportIssue,
  ProductImportPreviewRow,
  ProductImportStatus,
} from '@jg-app/shared'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth'
import {
  useCommitProductImport,
  useDownloadProductImportTemplate,
  useProductImportJob,
  useUploadProductImport,
} from '../hooks/use-product-import'

export type ProductImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusLabels: Record<ProductImportStatus, string> = {
  queued: 'Queued',
  validating: 'Validating',
  preview_ready: 'Preview ready',
  validation_failed: 'Validation failed',
  committing: 'Committing',
  completed: 'Completed',
  failed: 'Failed',
}

const statusVariants: Record<ProductImportStatus, ComponentProps<typeof Badge>['variant']> = {
  queued: 'info',
  validating: 'info',
  preview_ready: 'success',
  validation_failed: 'destructive',
  committing: 'warning',
  completed: 'success',
  failed: 'destructive',
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) return '—'
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatVariantLabel(row: ProductImportPreviewRow): string {
  const attributes = Object.values(row.attributeValues ?? {}).filter((value) => Boolean(value?.trim()))
  return [row.productName, attributes.join(' - ')].filter(Boolean).join(' ').trim() || '—'
}

function formatErrorDetails(details: unknown): string {
  if (typeof details === 'string') return details
  try {
    return JSON.stringify(details, null, 2)
  } catch {
    return String(details)
  }
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'destructive' | 'warning'
}) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-1 text-lg font-semibold',
          tone === 'destructive' && 'text-destructive',
          tone === 'warning' && 'text-warning-foreground',
        )}
      >
        {value}
      </p>
    </Card>
  )
}

function IssuesCell({
  errors,
  warnings,
}: {
  errors: ProductImportIssue[]
  warnings: ProductImportIssue[]
}) {
  if (errors.length === 0 && warnings.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="space-y-1">
      {errors.map((issue, index) => (
        <p key={`error-${issue.row}-${issue.column}-${index}`} className="text-xs text-destructive">
          {issue.column}: {issue.reason}
        </p>
      ))}
      {warnings.map((issue, index) => (
        <p
          key={`warning-${issue.row}-${issue.column}-${index}`}
          className="text-xs text-warning-foreground"
        >
          {issue.column}: {issue.reason}
        </p>
      ))}
    </div>
  )
}

export function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission('catalog:write') && hasPermission('cost_control:write')
  const [file, setFile] = useState<File | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const downloadTemplate = useDownloadProductImportTemplate()
  const upload = useUploadProductImport()
  const commit = useCommitProductImport()
  const jobQuery = useProductImportJob(jobId)

  const job = jobQuery.data
  const status = job?.status
  const preview = job?.preview ?? null
  const result = job?.result ?? null
  const isWorking =
    status === 'queued' || status === 'validating' || status === 'committing' || upload.isPending
  const jobErrorMessage = job?.error?.message ?? (jobQuery.isError ? jobQuery.error.message : null)
  const canCommit = Boolean(
    preview?.canCommit && status === 'preview_ready' && canWrite && !isWorking && !commit.isPending,
  )

  useEffect(() => {
    if (!open) {
      setFile(null)
      setJobId(null)
      setLocalError(null)
      setDownloading(false)
    }
  }, [open])

  useEffect(() => {
    if (job?.status === 'completed') {
      void queryClient.invalidateQueries({ queryKey: ['products'] })
    }
  }, [job?.status, queryClient])

  const handleDownload = async () => {
    setLocalError(null)
    setDownloading(true)
    try {
      await downloadTemplate()
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to download the template')
    } finally {
      setDownloading(false)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setJobId(null)
    setLocalError(null)
  }

  const handleValidate = () => {
    if (!file) return
    setLocalError(null)
    upload.mutate(
      { file },
      {
        onSuccess: (data) => setJobId(data.jobId),
        onError: (error) =>
          setLocalError(error instanceof Error ? error.message : 'Failed to validate the file'),
      },
    )
  }

  const handleCommit = () => {
    if (!job || !canCommit) return
    setLocalError(null)
    commit.mutate(
      { jobId: job.jobId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: ['products'] })
        },
        onError: (error) =>
          setLocalError(error instanceof Error ? error.message : 'Failed to commit the import'),
      },
    )
  }

  const hasFailure =
    status === 'validation_failed' ||
    status === 'failed' ||
    (jobErrorMessage !== null && status !== 'completed')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-5 overflow-hidden sm:max-w-5xl">
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle>Bulk Product Upload</DialogTitle>
          <DialogDescription>
            Download the template, validate your workbook, review the preview, then commit the import.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          <section className="space-y-2 rounded-lg border border-border/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">1. Download template</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Fill one row per variant, use the values from the Lists sheet, and remove all SAMPLE
                  rows before uploading.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Download />
                )}
                Download template
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border/70 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">2. Choose and validate file</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Only .xlsx files up to 9 MB are accepted. Validation does not change any products.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="product-import-file">Excel workbook</Label>
                <Input
                  id="product-import-file"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={isWorking}
                />
                {file && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{file.name}</span> (
                    {formatFileSize(file.size)})
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleValidate}
                disabled={!file || isWorking}
              >
                {upload.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UploadCloud />
                )}
                Validate file
              </Button>
            </div>
          </section>

          {jobId && (
            <section className="space-y-3 rounded-lg border border-border/70 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariants[status ?? 'queued']}>
                    {statusLabels[status ?? 'queued']}
                  </Badge>
                  {job?.phase && (
                    <span className="text-xs text-muted-foreground">Phase: {job.phase}</span>
                  )}
                </div>
                {isWorking && (
                  <p role="status" className="text-xs text-muted-foreground">
                    Working…
                  </p>
                )}
              </div>

              {jobQuery.isPending && !job ? (
                <div className="space-y-2">
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : job ? (
                <div className="space-y-2">
                  <div
                    role="progressbar"
                    aria-label="Import progress"
                    aria-valuenow={Math.round(job.progress)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, job.progress))}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {job.processedRows.toLocaleString('en-IN')} /{' '}
                    {job.totalRows.toLocaleString('en-IN')} rows processed
                  </p>
                </div>
              ) : null}
            </section>
          )}

          {localError && (
            <Alert variant="destructive">
              <AlertTitle>Unable to continue</AlertTitle>
              <AlertDescription>{localError}</AlertDescription>
            </Alert>
          )}

          {hasFailure && (
            <Alert variant="destructive">
              <AlertTitle>
                {status === 'validation_failed' ? 'Validation failed' : 'Import failed'}
              </AlertTitle>
              <AlertDescription>
                <p>
                  {jobErrorMessage ??
                    'The workbook could not be validated. Fix the reported issues and upload it again.'}
                </p>
                {job?.error?.details != null && (
                  <pre className="mt-2 max-h-24 overflow-auto whitespace-pre-wrap text-xs">
                    {formatErrorDetails(job.error.details)}
                  </pre>
                )}
                <p className="mt-1">Choose a corrected file above to try again.</p>
              </AlertDescription>
            </Alert>
          )}

          {preview && (
            <section className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Products" value={preview.productCount} />
                <SummaryCard label="Variants" value={preview.variantCount} />
                <SummaryCard label="Errors" value={preview.errors.length} tone="destructive" />
                <SummaryCard label="Warnings" value={preview.warnings.length} tone="warning" />
              </div>

              <div className="overflow-hidden rounded-lg border border-border/70">
                <div className="flex flex-col gap-1 border-b px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-medium">Preview rows</h3>
                  <span className="text-xs text-muted-foreground">
                    {preview.rows.length} of {preview.totalRows} rows shown
                  </span>
                </div>
                <div className="max-h-[320px] overflow-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Row</TableHead>
                        <TableHead>Product / Variant</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead className="min-w-[240px]">Issues</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.map((row) => (
                        <TableRow key={row.row}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {row.row}
                          </TableCell>
                          <TableCell className="font-medium">{formatVariantLabel(row)}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.skuCode ?? <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="text-right">{formatPrice(row.costPrice)}</TableCell>
                          <TableCell className="text-right">{formatPrice(row.sellingPrice)}</TableCell>
                          <TableCell className="text-right">
                            {row.marginPct === null
                              ? '—'
                              : `${row.marginPct.toLocaleString('en-IN', { maximumFractionDigits: 2 })}%`}
                          </TableCell>
                          <TableCell>
                            <IssuesCell errors={row.errors} warnings={row.warnings} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </section>
          )}

          {result && (
            <section className="space-y-3 rounded-lg border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="size-4" />
                Import completed
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Products created" value={result.productsCreated} />
                <SummaryCard label="Variants created" value={result.variantsCreated} />
                <SummaryCard label="Batches created" value={result.inventoryBatchesCreated} />
                <SummaryCard label="Generated SKUs" value={result.generatedSkus.length} />
              </div>
              {result.generatedSkus.length > 0 && (
                <p className="break-words text-xs text-muted-foreground">
                  Generated SKUs: {result.generatedSkus.join(', ')}
                </p>
              )}
            </section>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleCommit} disabled={!canCommit}>
            {commit.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
            {commit.isPending ? 'Committing…' : 'Commit import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
