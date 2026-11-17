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

}
