import { number, object, optional, nullable, string, boolean } from 'valibot'

export const CreateExpenseSchema = object({
  expenseDate: string('Expense date is required'),
  categoryId: number('Category is required'),
  expenseScheduleId: optional(number()),
  purchaseReceiptId: optional(number()),
  amount: number('Amount is required'),
  fromDate: optional(string()),
  toDate: optional(string()),
  remarks: optional(string()),
  paymentMode: optional(string()),
  accountId: optional(number()),
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
  expenseDate: optional(string('Expense date is required')),
  categoryId: optional(number('Category is required')),
  expenseScheduleId: optional(number()),
  purchaseReceiptId: optional(number()),
  amount: optional(number('Amount is required')),
  fromDate: optional(string()),
  toDate: optional(string()),
  remarks: optional(string()),
  paymentMode: optional(string()),
  accountId: optional(number()),
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
