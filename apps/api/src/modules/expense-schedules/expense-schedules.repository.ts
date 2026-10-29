import { prisma } from '#/lib/prisma'
import type { ExpenseFrequency } from '@prisma/client'

export const expenseSchedulesRepository = {
  async findAll() {
    return prisma.expenseSchedule.findMany({
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { title: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.expenseSchedule.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    })
  },

  async create(data: {
    title: string
    categoryId: number
    frequency: ExpenseFrequency
    amount?: number
    startDate: Date
    endDate?: Date
    intervalDays?: number
    remarks?: string
    isActive?: boolean
  }) {
    return prisma.expenseSchedule.create({ data })
  },

  async update(
    id: number,
    data: {
      title?: string
      categoryId?: number
      frequency?: ExpenseFrequency
      amount?: number
      startDate?: Date
      endDate?: Date | null
      intervalDays?: number
      remarks?: string
      isActive?: boolean
    },
  ) {
    return prisma.expenseSchedule.update({ where: { id }, data })
  },
}
