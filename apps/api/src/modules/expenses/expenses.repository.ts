import { prisma } from '#/lib/prisma'

export const expensesRepository = {
  async findAll() {
    return prisma.expense.findMany({
      include: {
        category: {
          select: { id: true, name: true },
        },
        expenseSchedule: {
          select: { id: true, title: true },
        },
      },
      orderBy: { expenseDate: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.expense.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
        expenseSchedule: {
          select: { id: true, title: true },
        },
      },
    })
  },

  async findLatestExpenseNumberByPrefix(prefix: string) {
    return prisma.expense.findFirst({
      where: { expenseNumber: { startsWith: prefix } },
      orderBy: { expenseNumber: 'desc' },
      select: { expenseNumber: true },
    })
  },

  async create(data: {
    expenseNumber: string
    expenseDate: Date
    categoryId: number
    expenseScheduleId?: number
    purchaseReceiptId?: number
    amount: number
    fromDate?: Date
    toDate?: Date
    remarks?: string
    paymentMode?: string
    accountId?: number | null
    referenceNumber?: string
    isPurchaseExpense?: boolean
    isPaid?: boolean
    paidDate?: Date | null
    isActive?: boolean
  }) {
    return prisma.expense.create({ data })
  },

  async update(
    id: number,
    data: {
      expenseDate?: Date
      categoryId?: number
      expenseScheduleId?: number
      purchaseReceiptId?: number
      amount?: number
      fromDate?: Date | null
      toDate?: Date | null
      remarks?: string
      paymentMode?: string
      accountId?: number | null
      referenceNumber?: string
      isPurchaseExpense?: boolean
      isPaid?: boolean
      paidDate?: Date | null
      isActive?: boolean
    },
  ) {
    return prisma.expense.update({ where: { id }, data })
  },

  async delete(id: number) {
    return prisma.$transaction(async (tx) => {
      await tx.expenseAllocation.deleteMany({ where: { expenseId: id } })
      return tx.expense.delete({ where: { id } })
    })
  },
}
