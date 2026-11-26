import { ValidationError } from '#/lib/errors'

const DAY_IN_MS = 24 * 60 * 60 * 1000

type CalendarDate = {
  year: number
  month: number
  day: number
}

type ZonedParts = CalendarDate & {
  hour: number
  minute: number
  second: number
}

function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value ?? '')

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour'),
    minute: part('minute'),
    second: part('second'),
  }
}

/** Offset of a zoned wall-clock reading from UTC, in milliseconds. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const local = zonedParts(date, timeZone)
  const asUtc = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second,
  )

  return asUtc + date.getUTCMilliseconds() - date.getTime()
}

function tomorrowCalendarDate(now: Date, timeZone: string): CalendarDate {
  const today = zonedParts(now, timeZone)
  // Add a day in UTC so DST transitions cannot shift the calendar date.
  const tomorrow = new Date(Date.UTC(today.year, today.month - 1, today.day) + DAY_IN_MS)

  return {
    year: tomorrow.getUTCFullYear(),
    month: tomorrow.getUTCMonth() + 1,
    day: tomorrow.getUTCDate(),
  }
}

function resolveTomorrowAtLocalTime(
  timeZone: string,
  hour: number,
  minute: number,
  now: Date,
): Date {
  const date = tomorrowCalendarDate(now, timeZone)
  const target = Date.UTC(date.year, date.month - 1, date.day, hour, minute, 0)

  // Convert wall-clock time to UTC by iterating on the zone offset. This keeps
  // the requested local time stable on DST transition days.
  let candidate = target
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const next = target - zoneOffsetMs(new Date(candidate), timeZone)
    if (next === candidate) break
    candidate = next
  }

  const actual = zonedParts(new Date(candidate), timeZone)
  if (
    actual.year !== date.year ||
    actual.month !== date.month ||
    actual.day !== date.day ||
    actual.hour !== hour ||
    actual.minute !== minute ||
    actual.second !== 0
  ) {
    throw new ValidationError(
      `Unable to resolve ${hour}:${String(minute).padStart(2, '0')} in time zone ${timeZone}`,
    )
  }

  return new Date(candidate)
}

/** Tomorrow's calendar date in `timeZone` at the requested wall-clock time. */
export function tomorrowAtLocalTime(
  timeZone: string,
  hour = 9,
  minute = 0,
  now: Date = new Date(),
): Date {
  try {
    return resolveTomorrowAtLocalTime(timeZone, hour, minute, now)
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new ValidationError(`Unable to calculate a due date in time zone ${timeZone}`)
  }
}
