import {
  boolean,
  check,
  integer,
  isoDate,
  maxValue,
  minValue,
  nullable,
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
const expenseDate = pipe(string(), isoDate('Enter a valid date'))

export const CreateExpenseSchema = object({
  expenseDate,
  categoryId: positiveId,
  expenseScheduleId: optional(positiveId),
  purchaseReceiptId: optional(positiveId),
  amount: positiveAmount,
  fromDate: optional(expenseDate),
  toDate: optional(expenseDate),
  remarks: optional(string()),
  paymentMode: optional(string()),
  accountId: optional(positiveId),
  referenceNumber: optional(string()),
  isPurchaseExpense: optional(boolean()),
  isPaid: optional(boolean()),
  paidDate: optional(nullable(string())),
  isActive: optional(boolean()),
})

export type CreateExpenseFormData = {
  expenseDate: string
  categoryId: number
  expenseScheduleId?: number
  purchaseReceiptId?: number
  amount: number
  fromDate?: string
  toDate?: string
  remarks?: string
  paymentMode?: string
  accountId?: number
  referenceNumber?: string
  isPurchaseExpense?: boolean
  isPaid?: boolean
  paidDate?: string | null
  isActive?: boolean
}

export const UpdateExpenseSchema = object({
  expenseDate: optional(expenseDate),
  categoryId: optional(positiveId),
  expenseScheduleId: optional(positiveId),
  purchaseReceiptId: optional(positiveId),
  amount: optional(positiveAmount),
  fromDate: optional(expenseDate),
  toDate: optional(expenseDate),
  remarks: optional(string()),
  paymentMode: optional(string()),
  accountId: optional(positiveId),
  referenceNumber: optional(string()),
  isPurchaseExpense: optional(boolean()),
  isPaid: optional(boolean()),
  paidDate: optional(nullable(string())),
  isActive: optional(boolean()),
})

export type UpdateExpenseFormData = {
  expenseDate?: string
  categoryId?: number
  expenseScheduleId?: number
  purchaseReceiptId?: number
  amount?: number
  fromDate?: string
  toDate?: string
  remarks?: string
  paymentMode?: string
  accountId?: number
  referenceNumber?: string
  isPurchaseExpense?: boolean
  isPaid?: boolean
  paidDate?: string | null
  isActive?: boolean
}
