import dayjs from '@/lib/dayjs'

type DateInput = string | number | Date | null | undefined

export function formatDateTime(value: DateInput): string {
  if (!value) return '—'
  return dayjs(value).format('DD MMM YYYY HH:mm')
}

export function formatDate(value: DateInput): string {
  if (!value) return '—'
  return dayjs(value).format('DD MMM YYYY')
}

export function formatMonth(value: DateInput): string {
  if (!value) return '—'
  return dayjs(value).format('MMM YYYY')
}
