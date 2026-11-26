import type { Prisma } from '@prisma/client'
import type { InferOutput } from 'valibot'
import {
  CreateCustomerEnquirySchema,
  UpdateCustomerEnquirySchema,
} from '@jg-app/validators'
import { prisma } from '#/lib/prisma'

export type CreateEnquiryData = InferOutput<typeof CreateCustomerEnquirySchema>
export type UpdateEnquiryData = Omit<
  InferOutput<typeof UpdateCustomerEnquirySchema>,
  'followUpDueDate'
> & {
  // Internal counter maintained by follow-up logging and task completion.
  followUpCount?: number
}

export const enquiriesRepository = {
  async findAll() {
    const enquiries = await prisma.customerEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { tasks: true } },
        tasks: {
          where: {
            isActive: true,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
          orderBy: { dueDate: 'asc' },
          select: { dueDate: true },
          take: 1,
        },
      },
    })

    return enquiries.map(({ tasks, ...enquiry }) => ({
      ...enquiry,
      followUpDueDate: tasks[0]?.dueDate ?? null,
    }))
  },

  async findById(id: number) {
    return prisma.customerEnquiry.findUnique({
      where: { id },
      include: {
        tasks: {
          where: { isActive: true },
          orderBy: { dueDate: 'asc' },
          select: { id: true, title: true, status: true, dueDate: true, priority: true },
        },
      },
    })
  },

  async create(data: CreateEnquiryData, tx: Prisma.TransactionClient = prisma) {
    return tx.customerEnquiry.create({
      data: { ...data, status: 'OPEN', followUpCount: 0 },
    })
  },

  async update(
    id: number,
    data: UpdateEnquiryData,
    tx: Prisma.TransactionClient = prisma,
  ) {
    return tx.customerEnquiry.update({ where: { id }, data })
  },

  async rescheduleOpenFollowUps(
    enquiryId: number,
    dueDate: Date,
    tx: Prisma.TransactionClient = prisma,
  ) {
    return tx.task.updateMany({
      where: {
        enquiryId,
        isActive: true,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      data: { dueDate },
    })
  },

  /** Advance the enquiry once when a linked task is completed. Never closes it. */
  async advanceFollowUp(id: number, tx: Prisma.TransactionClient = prisma) {
    const enquiry = await tx.customerEnquiry.findUnique({
      where: { id },
      select: { followUpCount: true, status: true },
    })
    if (!enquiry) return null
    if (enquiry.status === 'CLOSED_WON' || enquiry.status === 'CLOSED_LOST') return null

    const followUpCount = enquiry.followUpCount + 1
    return tx.customerEnquiry.update({
      where: { id },
      data: {
        followUpCount,
        status: followUpCount === 1 ? 'FOLLOW_UP_1' : 'FOLLOW_UP_2',
      },
      select: { id: true, followUpCount: true, status: true },
    })
  },
}
