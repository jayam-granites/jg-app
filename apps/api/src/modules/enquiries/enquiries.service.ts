import type { InferOutput } from 'valibot'
import { UpdateCustomerEnquirySchema } from '@jg-app/validators'
import { env } from '#/config/env'
import { NotFoundError, ValidationError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'
import { tomorrowAtLocalTime } from '#/lib/timezone'
import { tasksRepository } from '../tasks/tasks.repository'
import { enquiriesRepository, type CreateEnquiryData } from './enquiries.repository'

type UpdateEnquiryInput = Omit<
  InferOutput<typeof UpdateCustomerEnquirySchema>,
  'followUpDueDate'
> & {
  followUpDueDate?: string
}

const OPEN_STATUSES = ['OPEN', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] as const
const CLOSED_STATUSES = ['CLOSED_WON', 'CLOSED_LOST'] as const

function isOpenStatus(status: string): boolean {
  return (OPEN_STATUSES as readonly string[]).includes(status)
}

function isClosedStatus(status: string): boolean {
  return (CLOSED_STATUSES as readonly string[]).includes(status)
}

function followUpStatus(count: number): 'FOLLOW_UP_1' | 'FOLLOW_UP_2' {
  return count === 1 ? 'FOLLOW_UP_1' : 'FOLLOW_UP_2'
}

export const enquiriesService = {
  getAll() {
    return enquiriesRepository.findAll()
  },

  async getById(id: number) {
    const enquiry = await enquiriesRepository.findById(id)
    if (!enquiry) throw new NotFoundError('Customer enquiry')
    return enquiry
  },

  async create(data: CreateEnquiryData) {
    let dueDate: Date
    try {
      dueDate = tomorrowAtLocalTime(env.expenseScheduleTimeZone)
    } catch {
      throw new ValidationError('Unable to calculate the follow-up due date')
    }

    return prisma.$transaction(async (tx) => {
      const enquiry = await enquiriesRepository.create(data, tx)
      await tasksRepository.create(
        {
          title: `Follow up: ${enquiry.customerName}`,
          dueDate: dueDate.toISOString(),
          status: 'PENDING',
          priority: 'MEDIUM',
          enquiryId: enquiry.id,
        },
        tx,
      )
      return enquiry
    })
  },

  async update(id: number, data: UpdateEnquiryInput) {
    const enquiry = await this.getById(id)

    if (data.status && isClosedStatus(data.status)) {
      const closeReason = typeof data.closeReason === 'string' ? data.closeReason.trim() : ''
      if (enquiry.followUpCount < 2 || closeReason.length < 3) {
        throw new ValidationError(
          'Closing an enquiry requires at least two follow-ups and a close reason',
        )
      }
    }

    const { followUpDueDate, ...updates } = data
    let parsedDueDate: Date | undefined
    if (followUpDueDate !== undefined) {
      parsedDueDate = new Date(followUpDueDate)
      if (Number.isNaN(parsedDueDate.getTime())) {
        throw new ValidationError('Invalid follow-up due date')
      }
    }

    return prisma.$transaction(async (tx) => {
      const updated = await enquiriesRepository.update(id, updates, tx)
      if (parsedDueDate) {
        await enquiriesRepository.rescheduleOpenFollowUps(id, parsedDueDate, tx)
      }
      return updated
    })
  },

  async logFollowUp(id: number, notes?: string) {
    const enquiry = await this.getById(id)
    if (isClosedStatus(enquiry.status)) {
      throw new ValidationError('Cannot log a follow-up on a closed enquiry')
    }
    if (!isOpenStatus(enquiry.status)) {
      throw new ValidationError('Customer enquiry is not open for follow-ups')
    }

    const followUpCount = enquiry.followUpCount + 1
    const timestamp = new Date().toISOString()
    const entry = `[${timestamp}] ${notes?.trim() || 'Follow-up logged'}`
    const requirementsNotes = [enquiry.requirementsNotes?.trim(), entry]
      .filter(Boolean)
      .join('\n')

    return enquiriesRepository.update(id, {
      requirementsNotes,
      followUpCount,
      status: followUpStatus(followUpCount),
    })
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
