export type WeekdayName = {
  long: string
  short: string
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(date: Date, amount: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + amount, 1)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(date.getDate(), lastDay))
  return target
}

export function dateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function monthGrid(month: Date, weekStartsOn: 0 | 1 = 1): Date[] {
  const first = startOfMonth(month)
  const leadingDays = (first.getDay() - weekStartsOn + 7) % 7
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - leadingDays)

  return Array.from({ length: 42 }, (_, index) =>
    new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index),
  )
}

export function weekdayNames(locale?: string, weekStartsOn: 0 | 1 = 1): WeekdayName[] {
  // 2024-01-01 was a Monday and 2024-01-07 was a Sunday.
  const first = weekStartsOn === 1 ? new Date(2024, 0, 1) : new Date(2024, 0, 7)
  const longFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' })
  const shortFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index)
    return {
      long: longFormatter.format(date),
      short: shortFormatter.format(date),
    }
  })
}
