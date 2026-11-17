import { describe, expect, it } from 'bun:test'
import type { ExpenseFrequency } from '@prisma/client'
import { safeParse } from 'valibot'
import { CreateExpenseSchema } from '@jg-app/validators'
import { CreateExpenseScheduleSchema } from '@jg-app/validators'
import { dateInTimeZone, nextExpenseScheduleOccurrence } from './expense-schedule-dates'

describe('nextExpenseScheduleOccurrence', () => {
  it('keeps month-end schedules anchored to their original day', () => {
    const schedule = {
      frequency: 'MONTHLY' as ExpenseFrequency,
      startDate: new Date('2024-01-31T00:00:00.000Z'),
      intervalDays: null,
    }

    expect(nextExpenseScheduleOccurrence(schedule, null)?.toISOString()).toBe('2024-01-31T00:00:00.000Z')
    expect(
      nextExpenseScheduleOccurrence(schedule, new Date('2024-02-29T00:00:00.000Z'))?.toISOString(),
    ).toBe('2024-03-31T00:00:00.000Z')
  })

  it('advances custom schedules by their configured day interval', () => {
    const schedule = {
      frequency: 'CUSTOM' as ExpenseFrequency,
      startDate: new Date('2024-01-01T00:00:00.000Z'),
      intervalDays: 10,
    }

    expect(
      nextExpenseScheduleOccurrence(schedule, new Date('2024-01-11T00:00:00.000Z'))?.toISOString(),
    ).toBe('2024-01-21T00:00:00.000Z')
  })
})

describe('dateInTimeZone', () => {
  it('uses the requested local calendar date rather than the UTC date', () => {
    expect(
      dateInTimeZone(new Date('2024-01-01T20:00:00.000Z'), 'Asia/Kolkata').toISOString(),
    ).toBe('2024-01-02T00:00:00.000Z')
  })
})

describe('expense validation', () => {
  it('rejects non-positive expense amounts', () => {
    expect(
      safeParse(CreateExpenseSchema, {
        expenseDate: '2024-01-01',
        categoryId: 1,
        amount: 0,
      }).success,
    ).toBe(false)
  })

  it('requires a positive interval for custom schedules', () => {
    expect(
      safeParse(CreateExpenseScheduleSchema, {
        title: 'Internet',
        categoryId: 1,
        frequency: 'CUSTOM',
        startDate: '2024-01-01',
        intervalDays: 0,
      }).success,
    ).toBe(false)
  })
})
