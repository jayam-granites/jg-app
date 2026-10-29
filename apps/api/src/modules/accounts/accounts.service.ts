import { prisma } from '#/lib/prisma'
import { ValidationError } from '#/lib/errors'
import { accountsRepository } from './accounts.repository'

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export const accountsService = {
  async getAll() {
    return accountsRepository.findAll()
  },

  async getAllWithInactive() {
    return accountsRepository.findAllWithInactive()
  },

  async getById(id: number) {
    const account = await accountsRepository.findById(id)
    if (!account) throw new ValidationError('Account not found')
    return account
  },

  async create(data: {
    name: string
    type: 'CASH' | 'UPI' | 'BANK_ACCOUNT'
    ownerTag?: string
    initialBalance?: number
    isActive?: boolean
  }) {
    const initialBalance = round2(data.initialBalance ?? 0)
    const account = await accountsRepository.create({
      name: data.name,
      type: data.type,
      ownerTag: data.ownerTag ?? null,
      initialBalance,
      currentBalance: initialBalance,
      isActive: data.isActive ?? true,
    })

    if (initialBalance !== 0) {
      await prisma.accountTransaction.create({
        data: {
          accountId: account.id,
          type: 'INITIAL_BALANCE',
          amount: initialBalance,
          balanceAfter: initialBalance,
          referenceType: 'INITIAL_BALANCE',
          note: 'Initial balance',
          transactionDate: new Date(),
        },
      })
    }

    return account
  },

  async update(
    id: number,
    data: {
      name?: string
      type?: 'CASH' | 'UPI' | 'BANK_ACCOUNT'
      ownerTag?: string | null
      initialBalance?: number
      currentBalance?: number
      isActive?: boolean
    },
  ) {
    await this.getById(id)
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.ownerTag !== undefined) updateData.ownerTag = data.ownerTag
    if (data.initialBalance !== undefined) updateData.initialBalance = round2(data.initialBalance)
    if (data.currentBalance !== undefined) updateData.currentBalance = round2(data.currentBalance)
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    return accountsRepository.update(id, updateData)
  },

  async adjustBalance(
    accountId: number,
    data: {
      type: 'CREDIT' | 'DEBIT'
      amount: number
      note?: string
      transactionDate?: string
    },
  ) {
    const account = await this.getById(accountId)
    const amount = round2(data.amount)
    if (amount <= 0) throw new ValidationError('Amount must be greater than 0')

    const current = Number(account.currentBalance)
    const newBalance = data.type === 'CREDIT' ? round2(current + amount) : round2(current - amount)

    const txDate = data.transactionDate ? new Date(data.transactionDate) : new Date()

    const [updated] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
      prisma.accountTransaction.create({
        data: {
          accountId,
          type: 'MANUAL_ADJUSTMENT',
          amount: data.type === 'CREDIT' ? amount : -amount,
          balanceAfter: newBalance,
          referenceType: 'MANUAL_ADJUSTMENT',
          note: data.note ?? (data.type === 'CREDIT' ? 'Manual credit' : 'Manual debit'),
          transactionDate: txDate,
        },
      }),
    ])

    return updated
  },

  async applyInvoicePayment(accountId: number, invoiceId: number, amount: number) {
    const account = await this.getById(accountId)
    const amt = round2(amount)
    if (amt <= 0) return account
    const current = Number(account.currentBalance)
    const newBalance = round2(current + amt)
    const [updated] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
      prisma.accountTransaction.create({
        data: {
          accountId,
          type: 'INVOICE_PAYMENT',
          amount: amt,
          balanceAfter: newBalance,
          referenceId: String(invoiceId),
          referenceType: 'INVOICE',
          note: `Invoice payment for invoice #${invoiceId}`,
          transactionDate: new Date(),
        },
      }),
    ])
    return updated
  },

  async revertInvoicePayment(accountId: number, invoiceId: number, amount: number) {
    const account = await this.getById(accountId)
    const amt = round2(amount)
    if (amt <= 0) return account
    const current = Number(account.currentBalance)
    const newBalance = round2(current - amt)
    const [updated] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
      prisma.accountTransaction.create({
        data: {
          accountId,
          type: 'INVOICE_PAYMENT',
          amount: -amt,
          balanceAfter: newBalance,
          referenceId: String(invoiceId),
          referenceType: 'INVOICE',
          note: `Invoice payment reversed for invoice #${invoiceId}`,
          transactionDate: new Date(),
        },
      }),
    ])
    return updated
  },

  async applyExpensePayment(accountId: number, expenseId: number, amount: number) {
    const account = await this.getById(accountId)
    const amt = round2(amount)
    if (amt <= 0) return account
    const current = Number(account.currentBalance)
    const newBalance = round2(current - amt)
    const [updated] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: newBalance },
      }),
      prisma.accountTransaction.create({
        data: {
          accountId,
          type: 'EXPENSE',
          amount: -amt,
          balanceAfter: newBalance,
          referenceId: String(expenseId),
          referenceType: 'EXPENSE',
          note: `Expense payment for expense #${expenseId}`,
          transactionDate: new Date(),
        },
      }),
    ])
    return updated
  },

  async getStatement(accountId: number) {
    await this.getById(accountId)
    const transactions = await accountsRepository.getTransactions(accountId)
    return transactions
  },

  async delete(id: number) {
    await this.getById(id)
    return accountsRepository.update(id, { isActive: false })
  },
}
