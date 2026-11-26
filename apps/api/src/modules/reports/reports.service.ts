import type { InvoiceInsightData, ReportGranularity, ReportStatusFilter, SalesReportData } from '@jg-app/shared'
import { ValidationError } from '#/lib/errors'
import { isValidDateKey, reportsRepository } from './reports.repository'

export type ReportsQuery = {
  from?: string | undefined
  to?: string | undefined
  granularity?: ReportGranularity | undefined
  status?: ReportStatusFilter | undefined
}

type NormalizedQuery = {
  from: string
  to: string
  granularity: ReportGranularity
  status: ReportStatusFilter
}

function utcKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`
}

function todayKey(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

function normalize(query: ReportsQuery): NormalizedQuery {
  const today = todayKey()
  const from = query.from ?? `${today.slice(0, 7)}-01`
  const to = query.to ?? today

  if (!isValidDateKey(from) || !isValidDateKey(to)) {
    throw new ValidationError('Dates must use a valid YYYY-MM-DD value')
  }
  if (from > to) throw new ValidationError('from must be on or before to')

  const upper = new Date(`${to}T00:00:00Z`)
  const earliest = new Date(upper)
  earliest.setUTCFullYear(earliest.getUTCFullYear() - 5)
  const clampedFrom = from < utcKey(earliest) ? utcKey(earliest) : from

  return {
    from: clampedFrom,
    to,
    granularity: query.granularity ?? 'monthly',
    status: query.status ?? 'active',
  }
}

export const reportsService = {
  getSalesReport(query: ReportsQuery): Promise<SalesReportData> {
    const { from, to, granularity, status } = normalize(query)
    return reportsRepository.getSalesReport(from, to, granularity, status)
  },

  getInvoiceInsight(id: number): Promise<InvoiceInsightData> {
    return reportsRepository.getInvoiceInsight(id)
  },
}
