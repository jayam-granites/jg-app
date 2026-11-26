import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type {
  InvoiceInsightData,
  ReportGranularity,
  ReportStatusFilter,
  SalesReportData,
} from '@jg-app/shared'
import { client } from '@/lib/api'
import dayjs from '@/lib/dayjs'

export type SalesReportFilters = {
  from: string
  to: string
  granularity: ReportGranularity
  status: ReportStatusFilter
}

export const DEFAULT_REPORT_FILTERS: SalesReportFilters = {
  from: dayjs().subtract(6, 'month').startOf('month').format('YYYY-MM-DD'),
  to: dayjs().format('YYYY-MM-DD'),
  granularity: 'monthly',
  status: 'active',
}

/** Local filter state shared by every report page. */
export function useReportFilters(initial?: Partial<SalesReportFilters>) {
  const [filters, setFilters] = useState<SalesReportFilters>(() => ({
    ...DEFAULT_REPORT_FILTERS,
    ...initial,
  }))

  const updateFilters = useCallback((patch: Partial<SalesReportFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }, [])

  return { filters, setFilters, updateFilters }
}

export function useSalesReport(filters: SalesReportFilters) {
  return useQuery({
    queryKey: ['reports', 'sales', filters],
    queryFn: async (): Promise<SalesReportData> => {
      const res = await ((client.api as any).reports.sales.$get as any)({
        query: {
          from: filters.from,
          to: filters.to,
          granularity: filters.granularity,
          status: filters.status,
        },
      }) as Response
      const json = (await res.json()) as {
        data?: SalesReportData
        error?: { message?: string }
      }
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load report')
      }
      return json.data
    },
  })
}

export function useInvoiceInsight(id: number | null) {
  return useQuery({
    queryKey: ['reports', 'invoice-insight', id],
    enabled: !!id,
    queryFn: async (): Promise<InvoiceInsightData> => {
      const res = await ((client.api as any).reports.invoices[':id'].insight.$get as any)({
        param: { id: String(id) },
      }) as Response
      const json = (await res.json()) as {
        data?: InvoiceInsightData
        error?: { message?: string }
      }
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load invoice insight')
      }
      return json.data
    },
  })
}
