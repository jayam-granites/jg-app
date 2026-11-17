import { expenseSchedulesRepository } from './expense-schedules.repository'
import { ValidationError } from '#/lib/errors'
import { Prisma } from '@prisma/client'
import type { ExpenseFrequency } from '@prisma/client'
import { env } from '#/config/env'
import { prisma } from '#/lib/prisma'
import { allocateNextExpenseNumber } from '../expenses/expense-number'
import { dateInTimeZone, nextExpenseScheduleOccurrence } from './expense-schedule-dates'

function assertScheduleDates(startDate: string, endDate?: string | null) {
  if (endDate && endDate < startDate) {
    throw new ValidationError('End date must be on or after start date')
  }
}

function assertInterval(frequency: string, intervalDays?: number | null) {
  if (frequency === 'CUSTOM' && (!Number.isInteger(intervalDays) || !intervalDays || intervalDays < 1)) {
    throw new ValidationError('Custom schedules require an interval of at least 1 day')
  }
}

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
    assertScheduleDates(data.startDate, data.endDate)
    assertInterval(data.frequency, data.intervalDays)
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

    const frequency = data.frequency ?? existing.frequency
    const startDate = data.startDate ?? existing.startDate.toISOString().slice(0, 10)
    const endDate = data.endDate === undefined
      ? existing.endDate?.toISOString().slice(0, 10) ?? null
      : data.endDate || null
    const intervalDays = data.intervalDays ?? existing.intervalDays
    assertScheduleDates(startDate, endDate)
    assertInterval(frequency, intervalDays)

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

  async processDueSchedules(runAt = new Date()) {
    const throughDate = dateInTimeZone(runAt, env.expenseScheduleTimeZone)
    const schedules = await prisma.expenseSchedule.findMany({
      where: { isActive: true },
      select: { id: true },
    })
    let generated = 0
    let skippedWithoutAmount = 0

    for (const { id } of schedules) {
      while (true) {
        const result = await prisma.$transaction(async (tx) => {
          await tx.$queryRaw(Prisma.sql`
            SELECT id FROM expense_schedules WHERE id = ${id} FOR UPDATE
          `)
          const schedule = await tx.expenseSchedule.findUnique({ where: { id } })
          if (!schedule || !schedule.isActive) return { done: true, generated: false, skipped: false }

          const occurrenceDate = nextExpenseScheduleOccurrence(
            schedule,
            schedule.lastProcessedOccurrenceDate,
          )
          if (
            !occurrenceDate ||
            occurrenceDate > throughDate ||
            (schedule.endDate && occurrenceDate > dateInTimeZone(schedule.endDate, 'UTC'))
          ) {
            return { done: true, generated: false, skipped: false }
          }

          if (schedule.amount == null || Number(schedule.amount) <= 0) {
            await tx.expenseSchedule.update({
              where: { id },
              data: { lastProcessedOccurrenceDate: occurrenceDate },
            })
            return { done: false, generated: false, skipped: true }
          }

          const expenseNumber = await allocateNextExpenseNumber(tx, occurrenceDate)
          await tx.expense.create({
            data: {
              expenseNumber,
              expenseDate: occurrenceDate,
              categoryId: schedule.categoryId,
              expenseScheduleId: schedule.id,
              scheduleOccurrenceDate: occurrenceDate,
              amount: schedule.amount,
              remarks: schedule.remarks ?? `Generated from schedule: ${schedule.title}`,
              isPurchaseExpense: false,
              isPaid: false,
              isActive: true,
            },
          })
          await tx.expenseSchedule.update({
            where: { id },
            data: { lastProcessedOccurrenceDate: occurrenceDate },
          })
          return { done: false, generated: true, skipped: false }
        })

        if (result.done) break
        if (result.generated) generated += 1
        if (result.skipped) skippedWithoutAmount += 1
      }
    }

    return { generated, skippedWithoutAmount }
  },
}
