import type { ExpenseFrequency, ExpenseSchedule } from '@prisma/client'

const DAY_IN_MS = 24 * 60 * 60 * 1000

function dateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function occurrenceAt(
  startDate: Date,
  frequency: ExpenseFrequency,
  intervalDays: number | null,
  index: number,
): Date | null {
  const start = dateOnly(startDate)

  switch (frequency) {
    case 'ONE_TIME':
      return index === 0 ? start : null
    case 'DAILY':
      return new Date(start.getTime() + index * DAY_IN_MS)
    case 'WEEKLY':
      return new Date(start.getTime() + index * 7 * DAY_IN_MS)
    case 'CUSTOM':
      return intervalDays && intervalDays > 0
        ? new Date(start.getTime() + index * intervalDays * DAY_IN_MS)
        : null
    case 'MONTHLY': {
      const monthIndex = start.getUTCMonth() + index
      const year = start.getUTCFullYear() + Math.floor(monthIndex / 12)
      const month = monthIndex % 12
      const day = Math.min(
        start.getUTCDate(),
        new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
      )
      return new Date(Date.UTC(year, month, day))
    }
  }
}

export function nextExpenseScheduleOccurrence(
  schedule: Pick<ExpenseSchedule, 'frequency' | 'startDate' | 'intervalDays'>,
  after: Date | null,
): Date | null {
  const start = dateOnly(schedule.startDate)
  if (!after || dateOnly(after) < start) return start

  if (schedule.frequency === 'ONE_TIME') return null

  const elapsedDays = Math.floor((dateOnly(after).getTime() - start.getTime()) / DAY_IN_MS)
  let index: number

  switch (schedule.frequency) {
    case 'DAILY':
      index = elapsedDays + 1
      break
    case 'WEEKLY':
      index = Math.floor(elapsedDays / 7) + 1
      break
    case 'CUSTOM':
      if (!schedule.intervalDays || schedule.intervalDays <= 0) return null
      index = Math.floor(elapsedDays / schedule.intervalDays) + 1
      break
    case 'MONTHLY': {
      index =
        (dateOnly(after).getUTCFullYear() - start.getUTCFullYear()) * 12 +
        dateOnly(after).getUTCMonth() -
        start.getUTCMonth()
      let candidate = occurrenceAt(start, schedule.frequency, schedule.intervalDays, index)
      while (candidate && candidate <= dateOnly(after)) {
        index += 1
        candidate = occurrenceAt(start, schedule.frequency, schedule.intervalDays, index)
      }
      break
    }
  }

  return occurrenceAt(start, schedule.frequency, schedule.intervalDays, index)
}

export function dateInTimeZone(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const part = (type: 'year' | 'month' | 'day') => Number(parts.find((item) => item.type === type)?.value)

  return new Date(Date.UTC(part('year'), part('month') - 1, part('day')))
}
