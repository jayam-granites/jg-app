import { Prisma } from '@prisma/client'
import type { CreateExpenseFormData, UpdateExpenseFormData } from '@jg-app/validators'
import { prisma } from '#/lib/prisma'
import { ValidationError } from '#/lib/errors'
import { expensesRepository } from './expenses.repository'
import { allocateNextExpenseNumber } from './expense-number'

type ExpensePaymentState = {
  id: number
  accountId: number | null
  amount: Prisma.Decimal
  isPaid: boolean
  paidDate: Date | null
}

function parseDate(value: string, label: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} must be a valid date`)
  return date
}

function validateDateRange(fromDate?: string | null, toDate?: string | null) {
  if (fromDate && toDate && fromDate > toDate) {
    throw new ValidationError('From date must be on or before to date')
  }
}

async function validateScheduleCategory(
  tx: Prisma.TransactionClient,
  expenseScheduleId: number | null | undefined,
  categoryId: number,
) {
  if (expenseScheduleId == null) return

  const schedule = await tx.expenseSchedule.findUnique({
    where: { id: expenseScheduleId },
    select: { categoryId: true },
  })
  if (!schedule) throw new ValidationError('Expense schedule not found')
  if (schedule.categoryId !== categoryId) {
    throw new ValidationError('Expense category must match the selected schedule')
  }
}

async function validateAccount(tx: Prisma.TransactionClient, accountId?: number) {
  if (accountId === undefined) return
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { id: true },
  })
  if (!account) throw new ValidationError('Account not found')
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

async function synchronizeExpenseLedger(
  tx: Prisma.TransactionClient,
  expense: ExpensePaymentState,
) {
  const transactions = await tx.accountTransaction.findMany({
    where: { referenceId: String(expense.id), referenceType: 'EXPENSE' },
    select: { id: true, accountId: true, amount: true },
    orderBy: { id: 'asc' },
  })

  const netByAccount = new Map<number, number>()
  for (const transaction of transactions) {
    netByAccount.set(
      transaction.accountId,
      round2((netByAccount.get(transaction.accountId) ?? 0) + Number(transaction.amount)),
    )
  }

  const targetAccountId = expense.isPaid ? expense.accountId : null
  const targetDebitAmount = targetAccountId == null ? 0 : round2(Number(expense.amount))
  const targetAmount = -targetDebitAmount
  const alreadySynchronized =
    (targetAccountId == null && [...netByAccount.values()].every((amount) => amount === 0)) ||
    (targetAccountId != null &&
      [...netByAccount].every(([accountId, amount]) => accountId === targetAccountId || amount === 0) &&
      round2(netByAccount.get(targetAccountId) ?? 0) === targetAmount)
  if (alreadySynchronized) return

  for (const transaction of transactions) {
    const reversalAmount = round2(-Number(transaction.amount))
    if (reversalAmount === 0) continue

    const account = await tx.account.update({
      where: { id: transaction.accountId },
      data: { currentBalance: { increment: reversalAmount } },
      select: { currentBalance: true },
    })
    await tx.accountTransaction.create({
      data: {
        accountId: transaction.accountId,
        type: 'EXPENSE',
        amount: reversalAmount,
        balanceAfter: account.currentBalance,
        referenceId: String(expense.id),
        referenceType: 'EXPENSE',
        note: `Expense payment reversed for expense #${expense.id}`,
        transactionDate: new Date(),
      },
    })
  }

  if (targetAccountId == null) return

  const accountExists = await tx.account.findUnique({
    where: { id: targetAccountId },
    select: { id: true },
  })
  if (!accountExists) throw new ValidationError('Account not found')

  const account = await tx.account.update({
    where: { id: targetAccountId },
    data: { currentBalance: { decrement: targetDebitAmount } },
    select: { currentBalance: true },
  })
  await tx.accountTransaction.create({
    data: {
      accountId: targetAccountId,
      type: 'EXPENSE',
      amount: targetAmount,
      balanceAfter: account.currentBalance,
      referenceId: String(expense.id),
      referenceType: 'EXPENSE',
      note: `Expense payment for expense #${expense.id}`,
      transactionDate: expense.paidDate ?? new Date(),
    },
  })
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

  async create(data: CreateExpenseFormData) {
    validateDateRange(data.fromDate, data.toDate)
    const expenseDate = parseDate(data.expenseDate, 'Expense date')
    const isPaid = data.isPaid ?? false
    const paidDate =
      data.paidDate !== undefined
        ? data.paidDate
          ? parseDate(data.paidDate, 'Paid date')
          : null
        : isPaid
          ? new Date()
          : null

    return prisma.$transaction(async (tx) => {
      await validateScheduleCategory(tx, data.expenseScheduleId, data.categoryId)
      await validateAccount(tx, data.accountId)
      const expenseNumber = await allocateNextExpenseNumber(tx, expenseDate)
      const expense = await tx.expense.create({
        data: {
          expenseNumber,
          expenseDate,
          categoryId: data.categoryId,
          expenseScheduleId: data.expenseScheduleId,
          purchaseReceiptId: data.purchaseReceiptId,
          amount: data.amount,
          fromDate: data.fromDate ? parseDate(data.fromDate, 'From date') : undefined,
          toDate: data.toDate ? parseDate(data.toDate, 'To date') : undefined,
          remarks: data.remarks,
          paymentMode: data.paymentMode,
          accountId: data.accountId,
          referenceNumber: data.referenceNumber,
          isPurchaseExpense: data.isPurchaseExpense ?? false,
          isPaid,
          paidDate,
          isActive: data.isActive ?? true,
        },
      })

      await synchronizeExpenseLedger(tx, expense)
      return expense
    })
  },

  async update(id: number, data: UpdateExpenseFormData) {
    validateDateRange(data.fromDate, data.toDate)

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM expenses WHERE id = ${id} FOR UPDATE`)
      const existing = await tx.expense.findUnique({ where: { id } })
      if (!existing) throw new ValidationError('Expense not found')

      const fromDate =
        data.fromDate === undefined
          ? existing.fromDate
          : data.fromDate
            ? parseDate(data.fromDate, 'From date')
            : null
      const toDate =
        data.toDate === undefined
          ? existing.toDate
          : data.toDate
            ? parseDate(data.toDate, 'To date')
            : null
      if (fromDate && toDate && fromDate > toDate) {
        throw new ValidationError('From date must be on or before to date')
      }

      const categoryId = data.categoryId ?? existing.categoryId
      const expenseScheduleId = data.expenseScheduleId ?? existing.expenseScheduleId
      await validateScheduleCategory(tx, expenseScheduleId, categoryId)
      if (data.accountId !== undefined) await validateAccount(tx, data.accountId)

      const paidDate =
        data.isPaid === false
          ? null
          : data.paidDate !== undefined
            ? data.paidDate
              ? parseDate(data.paidDate, 'Paid date')
              : null
            : data.isPaid === true
              ? new Date()
              : existing.paidDate
      const updated = await tx.expense.update({
        where: { id },
        data: {
          ...(data.expenseDate !== undefined && {
            expenseDate: parseDate(data.expenseDate, 'Expense date'),
          }),
          ...(data.categoryId !== undefined && { categoryId }),
          ...(data.expenseScheduleId !== undefined && { expenseScheduleId }),
          ...(data.purchaseReceiptId !== undefined && { purchaseReceiptId: data.purchaseReceiptId }),
          ...(data.amount !== undefined && { amount: data.amount }),
          ...(data.fromDate !== undefined && { fromDate }),
          ...(data.toDate !== undefined && { toDate }),
          ...(data.remarks !== undefined && { remarks: data.remarks }),
          ...(data.paymentMode !== undefined && { paymentMode: data.paymentMode }),
          ...(data.accountId !== undefined && { accountId: data.accountId }),
          ...(data.referenceNumber !== undefined && { referenceNumber: data.referenceNumber }),
          ...(data.isPurchaseExpense !== undefined && { isPurchaseExpense: data.isPurchaseExpense }),
          ...(data.isPaid !== undefined && { isPaid: data.isPaid }),
          ...(data.isPaid !== undefined || data.paidDate !== undefined ? { paidDate } : {}),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
        },
      })

      await synchronizeExpenseLedger(tx, updated)
      return updated
    })
  },

  async delete(id: number) {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM expenses WHERE id = ${id} FOR UPDATE`)
      const expense = await tx.expense.findUnique({ where: { id } })
      if (!expense) throw new ValidationError('Expense not found')

      await synchronizeExpenseLedger(tx, {
        ...expense,
        isPaid: false,
        accountId: null,
      })
      await tx.expenseAllocation.deleteMany({ where: { expenseId: id } })
      await tx.expense.delete({ where: { id } })
    })
  },
}
