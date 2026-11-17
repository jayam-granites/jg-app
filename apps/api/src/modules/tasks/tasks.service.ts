import type { CreateTaskFormData, UpdateTaskFormData } from '@jg-app/validators'
import { NotFoundError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'
import { tasksRepository } from './tasks.repository'

async function validateRelations(data: {
  enquiryId?: number | null
  resourceId?: number | null
}) {
  const [enquiry, resource] = await Promise.all([
    data.enquiryId == null
      ? Promise.resolve(true)
      : prisma.customerEnquiry.findUnique({
          where: { id: data.enquiryId },
          select: { id: true },
        }),
    data.resourceId == null
      ? Promise.resolve(true)
      : prisma.resourceContact.findUnique({
          where: { id: data.resourceId },
          select: { id: true },
        }),
  ])
  if (!enquiry) throw new NotFoundError('Customer enquiry')
  if (!resource) throw new NotFoundError('Resource contact')
}

export const tasksService = {
  getAll() {
    return tasksRepository.findAll()
  },

  async getById(id: number) {
    const task = await tasksRepository.findById(id)
    if (!task) throw new NotFoundError('Task')
    return task
  },

  async create(data: CreateTaskFormData) {
    await validateRelations(data)
    return tasksRepository.create(data)
  },

  async update(id: number, data: UpdateTaskFormData) {
    await this.getById(id)
    await validateRelations(data)
    return tasksRepository.update(id, data)
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
