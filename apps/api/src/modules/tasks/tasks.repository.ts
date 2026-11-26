import type { Prisma } from '@prisma/client'
import type { InferOutput } from 'valibot'
import { CreateTaskSchema, UpdateTaskSchema } from '@jg-app/validators'
import { prisma } from '#/lib/prisma'

type CreateTaskData = InferOutput<typeof CreateTaskSchema>
type UpdateTaskData = InferOutput<typeof UpdateTaskSchema>

const relationIncludes = {
  enquiry: { select: { id: true, customerName: true, mobile: true, isActive: true } },
  resource: { select: { id: true, name: true, mobile: true, isActive: true } },
  customer: { select: { id: true, name: true, mobile: true, isActive: true } },
  supplier: { select: { id: true, name: true, mobile: true, isActive: true } },
  broker: { select: { id: true, name: true, mobile: true, isActive: true } },
  transport: { select: { id: true, name: true, mobile: true, isActive: true } },
}

export const tasksRepository = {
  async findAll() {
    return prisma.task.findMany({
      where: { isActive: true },
      include: relationIncludes,
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    })
  },

  async findById(id: number) {
    return prisma.task.findUnique({
      where: { id },
      include: relationIncludes,
    })
  },

  async findDueForReminder(cutoff: Date) {
    return prisma.task.findMany({
      where: {
        isActive: true,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lte: cutoff },
      },
      include: relationIncludes,
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    })
  },

  async create(data: CreateTaskData, tx: Prisma.TransactionClient = prisma) {
    return tx.task.create({
      data: { ...data, dueDate: new Date(data.dueDate) },
    })
  },

  async update(
    id: number,
    data: UpdateTaskData,
    tx: Prisma.TransactionClient = prisma,
  ) {
    const { dueDate, ...rest } = data
    return tx.task.update({
      where: { id },
      data: { ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
    })
  },
}
