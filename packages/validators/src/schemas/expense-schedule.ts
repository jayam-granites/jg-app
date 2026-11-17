import {
  boolean,
  check,
  enum_,
  integer,
  isoDate,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
} from 'valibot'

const positiveId = pipe(number(), integer(), minValue(1, 'Must be a positive ID'))
const positiveAmount = pipe(
  number(),
  minValue(0.01, 'Amount must be greater than zero'),
  maxValue(9_999_999_999.99, 'Amount exceeds the supported limit'),
  check((value) => Math.round(value * 100) / 100 === value, 'Amount can have at most 2 decimal places'),
)
const positiveInterval = pipe(number(), integer(), minValue(1, 'Interval must be at least 1 day'))
const scheduleDate = pipe(string(), isoDate('Enter a valid date'))

export const ExpenseFrequencyEnum = enum_({
  ONE_TIME: 'ONE_TIME',
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  CUSTOM: 'CUSTOM',
})

export const CreateExpenseScheduleSchema = object({
  title: pipe(
    string('Title must be a string'),
    minLength(1, 'Title is required'),
  ),
  categoryId: positiveId,
  frequency: ExpenseFrequencyEnum,
  amount: optional(positiveAmount),
  startDate: scheduleDate,
  endDate: optional(scheduleDate),
  intervalDays: optional(positiveInterval),
  remarks: optional(string()),
  isActive: optional(boolean()),
})

export type CreateExpenseScheduleFormData = {
  title: string
  categoryId: number
  frequency: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  amount?: number
  startDate: string
  endDate?: string
  intervalDays?: number
  remarks?: string
  isActive?: boolean
}

export const UpdateExpenseScheduleSchema = object({
  title: optional(pipe(string('Title must be a string'), minLength(1, 'Title is required'))),
  categoryId: optional(positiveId),
  frequency: optional(ExpenseFrequencyEnum),
  amount: optional(positiveAmount),
  startDate: optional(scheduleDate),
  endDate: optional(scheduleDate),
  intervalDays: optional(positiveInterval),
  remarks: optional(string()),
  isActive: optional(boolean()),
})

export type UpdateExpenseScheduleFormData = {
  title?: string
  categoryId?: number
  frequency?: 'ONE_TIME' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  amount?: number
  startDate?: string
  endDate?: string
  intervalDays?: number
  remarks?: string
  isActive?: boolean
}
