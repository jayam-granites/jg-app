import { minLength, number, object, optional, pipe, string, boolean, enum_ } from 'valibot'

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
  categoryId: number('Category is required'),
  frequency: ExpenseFrequencyEnum,
  amount: optional(number()),
  startDate: string('Start date is required'),
  endDate: optional(string()),
  intervalDays: optional(number()),
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
  categoryId: optional(number('Category is required')),
  frequency: optional(ExpenseFrequencyEnum),
  amount: optional(number()),
  startDate: optional(string()),
  endDate: optional(string()),
  intervalDays: optional(number()),
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
