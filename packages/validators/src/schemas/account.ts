import { boolean, number, object, optional, string, picklist } from 'valibot'

export const AccountTypeSchema = picklist(['CASH', 'UPI', 'BANK_ACCOUNT'])

export const CreateAccountSchema = object({
  name: string('Account name is required'),
  type: AccountTypeSchema,
  ownerTag: optional(string()),
  initialBalance: optional(number()),
  isActive: optional(boolean()),
})

export type CreateAccountFormData = {
  name: string
  type: 'CASH' | 'UPI' | 'BANK_ACCOUNT'
  ownerTag?: string
  initialBalance?: number
  isActive?: boolean
}

export const UpdateAccountSchema = object({
  name: optional(string('Account name is required')),
  type: optional(AccountTypeSchema),
  ownerTag: optional(string()),
  initialBalance: optional(number()),
  currentBalance: optional(number()),
  isActive: optional(boolean()),
})

export type UpdateAccountFormData = {
  name?: string
  type?: 'CASH' | 'UPI' | 'BANK_ACCOUNT'
  ownerTag?: string
  initialBalance?: number
  currentBalance?: number
  isActive?: boolean
}

export const CreateAccountAdjustmentSchema = object({
  accountId: number('Account is required'),
  type: picklist(['CREDIT', 'DEBIT']),
  amount: number('Amount is required'),
  note: optional(string()),
  transactionDate: optional(string()),
})

export type CreateAccountAdjustmentFormData = {
  accountId: number
  type: 'CREDIT' | 'DEBIT'
  amount: number
  note?: string
  transactionDate?: string
}
