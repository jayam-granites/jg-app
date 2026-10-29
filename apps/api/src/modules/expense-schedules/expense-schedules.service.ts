import { expenseSchedulesRepository } from './expense-schedules.repository'
import { ValidationError } from '#/lib/errors'
import type { ExpenseFrequency } from '@prisma/client'
import { Prisma } from '@prisma/client'

export const expenseSchedulesService = {
  async getAll() {
    return expenseSchedulesRepository.findAll()
  },

  async getById(id: number) {
    const schedule = await expenseSchedulesRepository.findById(id)
    if (!schedule) throw new ValidationError('Expense schedule not found')
    return schedule
  },

  async create(data: {
    title: string
    categoryId: number
    frequency: string
    amount?: number
    startDate: string
    endDate?: string
    intervalDays?: number
    remarks?: string
    isActive?: boolean
  }) {
    if (!data.categoryId || data.categoryId <= 0) {
      throw new ValidationError('Category is required')
    }
    try {
      return await expenseSchedulesRepository.create({
        title: data.title,
        categoryId: data.categoryId,
        frequency: data.frequency as ExpenseFrequency,
        amount: data.amount,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        intervalDays: data.intervalDays,
        remarks: data.remarks,
        isActive: data.isActive ?? true,
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ValidationError('Category not found')
      }
      throw err
    }
  },

  async update(
    id: number,
    data: {
      title?: string
      categoryId?: number
      frequency?: string
      amount?: number
      startDate?: string
      endDate?: string
      intervalDays?: number
      remarks?: string
      isActive?: boolean
    },
  ) {
    if (data.categoryId !== undefined && (!data.categoryId || data.categoryId <= 0)) {
      throw new ValidationError('Invalid category')
    }
    const existing = await expenseSchedulesRepository.findById(id)
    if (!existing) throw new ValidationError('Expense schedule not found')

    try {
      return await expenseSchedulesRepository.update(id, {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.frequency !== undefined && { frequency: data.frequency as ExpenseFrequency }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.intervalDays !== undefined && { intervalDays: data.intervalDays }),
        ...(data.remarks !== undefined && { remarks: data.remarks }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ValidationError('Category not found')
      }
      throw err
    }
  },
}
