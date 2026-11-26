import type { InferOutput } from 'valibot'
import { CreateTaskSchema, UpdateTaskSchema } from '@jg-app/validators'
import { NotFoundError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'
import { enquiriesRepository } from '../enquiries/enquiries.repository'
import { tasksRepository } from './tasks.repository'

type RelationIds = {
  enquiryId?: number | null
  resourceId?: number | null
  customerId?: number | null
  supplierId?: number | null
  brokerId?: number | null
  transportId?: number | null
}

async function checkRelation(
  id: number | null | undefined,
  resource: string,
  find: (relationId: number) => Promise<{ id: number } | null>,
) {
  if (id == null) return
  const related = await find(id)
  if (!related) throw new NotFoundError(resource)
}

async function validateRelations(data: RelationIds) {
  await Promise.all([
    checkRelation(data.enquiryId, 'Customer enquiry', (id) =>
      prisma.customerEnquiry.findUnique({ where: { id }, select: { id: true } }),
    ),
    checkRelation(data.resourceId, 'Resource contact', (id) =>
      prisma.resourceContact.findUnique({ where: { id }, select: { id: true } }),
    ),
    checkRelation(data.customerId, 'Customer', (id) =>
      prisma.customer.findUnique({ where: { id }, select: { id: true } }),
    ),
    checkRelation(data.supplierId, 'Supplier', (id) =>
      prisma.supplier.findUnique({ where: { id }, select: { id: true } }),
    ),
    checkRelation(data.brokerId, 'Broker', (id) =>
      prisma.broker.findUnique({ where: { id }, select: { id: true } }),
    ),
    checkRelation(data.transportId, 'Transport provider', (id) =>
      prisma.transportProvider.findUnique({ where: { id }, select: { id: true } }),
    ),
  ])
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

  async create(data: InferOutput<typeof CreateTaskSchema>) {
    await validateRelations(data)
    return tasksRepository.create(data)
  },

  async update(id: number, data: InferOutput<typeof UpdateTaskSchema>) {
    await this.getById(id)
    await validateRelations(data)

    return prisma.$transaction(async (tx) => {
      const current = await tx.task.findUnique({
        where: { id },
        select: { status: true, enquiryId: true },
      })
      const updated = await tasksRepository.update(id, data, tx)
      if (
        data.status === 'COMPLETED' &&
        current?.status !== 'COMPLETED' &&
        updated.enquiryId != null
      ) {
        await enquiriesRepository.advanceFollowUp(updated.enquiryId, tx)
      }
      return updated
    })
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
