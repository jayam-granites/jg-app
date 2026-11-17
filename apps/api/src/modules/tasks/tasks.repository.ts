import { prisma } from '#/lib/prisma'
import type { CreateTaskFormData, UpdateTaskFormData } from '@jg-app/validators'

export const tasksRepository = {
  async findAll() {
    return prisma.task.findMany({
      where: { isActive: true },
      include: {
        enquiry: { select: { id: true, customerName: true, mobile: true } },
        resource: { select: { id: true, name: true, mobile: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    })
  },

  async findById(id: number) {
    return prisma.task.findUnique({
      where: { id },
      include: {
        enquiry: { select: { id: true, customerName: true, mobile: true } },
        resource: { select: { id: true, name: true, mobile: true } },
      },
    })
  },

  async findDueForReminder(cutoff: Date) {
    return prisma.task.findMany({
      where: {
        isActive: true,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        dueDate: { lte: cutoff },
      },
      include: {
        enquiry: { select: { customerName: true, mobile: true, isActive: true } },
        resource: { select: { name: true, mobile: true, isActive: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
    })
  },

  async create(data: CreateTaskFormData) {
    return prisma.task.create({
      data: { ...data, dueDate: new Date(data.dueDate) },
    })
  },

  async update(id: number, data: UpdateTaskFormData) {
    const { dueDate, ...rest } = data
    return prisma.task.update({
      where: { id },
      data: { ...rest, ...(dueDate ? { dueDate: new Date(dueDate) } : {}) },
    })
  },
}
