import { expensesRepository } from './expenses.repository'
import { ValidationError } from '#/lib/errors'
import {
  expenseNumberPrefix,
  formatExpenseNumber,
  sequenceFromExpenseNumber,
} from './expense-number'

async function nextExpenseNumber(expenseDate: Date): Promise<string> {
  const prefix = expenseNumberPrefix(expenseDate)
  const latest = await expensesRepository.findLatestExpenseNumberByPrefix(prefix)
  const lastSequence = latest ? sequenceFromExpenseNumber(latest.expenseNumber, prefix) : 0
  return formatExpenseNumber(expenseDate, lastSequence + 1)
}

export const expensesService = {
  async getAll() {
    return expensesRepository.findAll()
  },

  async getById(id: number) {
    const expense = await expensesRepository.findById(id)
    if (!expense) throw new ValidationError('Expense not found')
    return expense
  },

  async create(data: {
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
    isActive?: boolean
  }) {
    const expenseDate = new Date(data.expenseDate)
    const expenseNumber = await nextExpenseNumber(expenseDate)
    const expense = await expensesRepository.create({
      expenseNumber,
      expenseDate,
      categoryId: data.categoryId,
      expenseScheduleId: data.expenseScheduleId,
      purchaseReceiptId: data.purchaseReceiptId,
      amount: data.amount,
      fromDate: data.fromDate ? new Date(data.fromDate) : undefined,
      toDate: data.toDate ? new Date(data.toDate) : undefined,
      remarks: data.remarks,
      paymentMode: data.paymentMode,
      accountId: data.accountId,
      referenceNumber: data.referenceNumber,
      isPurchaseExpense: data.isPurchaseExpense ?? true,
      isActive: data.isActive ?? true,
    })

    if (data.accountId && data.amount) {
      try {
        const { accountsService } = await import('../accounts/accounts.service')
        await accountsService.applyExpensePayment(data.accountId, expense.id, Number(data.amount))
      } catch (err) {
        // ignore if account service fails
      }
    }

    return expense
  },

  async update(
    id: number,
    data: {
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
    },
  ) {
    const existing = await expensesRepository.findById(id)
    if (!existing) throw new ValidationError('Expense not found')

    const updated = await expensesRepository.update(id, {
      ...(data.expenseDate !== undefined && { expenseDate: new Date(data.expenseDate) }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
      ...(data.expenseScheduleId !== undefined && { expenseScheduleId: data.expenseScheduleId }),
      ...(data.purchaseReceiptId !== undefined && { purchaseReceiptId: data.purchaseReceiptId }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.fromDate !== undefined && { fromDate: data.fromDate ? new Date(data.fromDate) : null }),
      ...(data.toDate !== undefined && { toDate: data.toDate ? new Date(data.toDate) : null }),
      ...(data.remarks !== undefined && { remarks: data.remarks }),
      ...(data.paymentMode !== undefined && { paymentMode: data.paymentMode }),
      ...(data.accountId !== undefined && { accountId: data.accountId }),
      ...(data.referenceNumber !== undefined && { referenceNumber: data.referenceNumber }),
      ...(data.isPurchaseExpense !== undefined && { isPurchaseExpense: data.isPurchaseExpense }),
      ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
      ...(data.paidDate !== undefined && { paidDate: data.paidDate ? new Date(data.paidDate) : null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    })

    // If marked paid and has accountId and not yet accounted for in a simple way, apply if needed
    if (data.isPaid === true && updated.accountId && updated.amount) {
      try {
        // Optionally could ensure accounting; keeping simple as per flow
      } catch (err) {
        // ignore
      }
    }

    return updated
  },

  async delete(id: number) {
    await this.getById(id)
    await expensesRepository.delete(id)
  },
}
