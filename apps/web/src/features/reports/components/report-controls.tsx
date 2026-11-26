import { useState } from 'react'
import type { ReportGranularity, ReportStatusFilter, SalesReportData } from '@jg-app/shared'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/shared/components/date-picker'
import { useAuth } from '@/providers/auth'
import { cn } from '@/lib/utils'
import type { SalesReportFilters } from '../hooks/use-reports'
import { downloadSalesCsv, exportSalesExcel, printReport } from '../lib/export'

const GRANULARITIES: { value: ReportGranularity; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

export type ReportControlsProps = {
  filters: SalesReportFilters
  onFiltersChange: (patch: Partial<SalesReportFilters>) => void
  data?: SalesReportData | null
  filename?: string
  showDates?: boolean
  showGranularity?: boolean
  showStatus?: boolean
  showExport?: boolean
  className?: string
}

export function ReportControls({
  filters,
  onFiltersChange,
  data,
  filename = 'sales-report',
  showDates = true,
  showGranularity = true,
  showStatus = true,
  showExport = true,
  className,
}: ReportControlsProps) {
  const { hasPermission } = useAuth()
  const [exporting, setExporting] = useState(false)
  const canExport = hasPermission('reports:export')
  const hasData = Boolean(data && (data.series.length > 0 || data.invoices.length > 0))

  async function handleExcel() {
    if (!data) return
    setExporting(true)
    try {
      await exportSalesExcel(data, filename)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className={cn('flex flex-wrap items-end gap-3 rounded-lg border border-border/70 bg-card p-3 shadow-xs', className)}>
      {showDates && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="report-from">From</label>
            <DatePicker
              id="report-from"
              value={filters.from}
              onChange={(value) => onFiltersChange({ from: value })}
              className="w-[160px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="report-to">To</label>
            <DatePicker
              id="report-to"
              value={filters.to}
              onChange={(value) => onFiltersChange({ to: value })}
              className="w-[160px]"
            />
          </div>
        </div>
      )}

      {showGranularity && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Granularity</span>
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-muted/40 p-1">
            {GRANULARITIES.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={filters.granularity === option.value ? 'default' : 'ghost'}
                className="h-7 px-2.5"
                aria-pressed={filters.granularity === option.value}
                onClick={() => onFiltersChange({ granularity: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showStatus && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="report-status">Status</label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ status: value as ReportStatusFilter })}
          >
            <SelectTrigger id="report-status" className="h-9 w-[180px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (not cancelled)</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {showExport && canExport && (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasData}
            onClick={() => data && downloadSalesCsv(data, filename)}
          >
            <Download className="size-4" /> CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasData || exporting}
            onClick={() => void handleExcel()}
          >
            <FileSpreadsheet className="size-4" /> {exporting ? 'Exporting…' : 'Excel'}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!hasData} onClick={printReport}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      )}
    </div>
  )
}
