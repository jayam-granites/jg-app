import type { InferOutput } from 'valibot'
import {
  CreateResourceContactSchema,
  TierGroupEnum,
  TradeContactTypeEnum,
  UpdateResourceContactSchema,
} from '@jg-app/validators'
import { prisma } from '#/lib/prisma'

export type CreateResourceData = InferOutput<typeof CreateResourceContactSchema>
export type UpdateResourceData = InferOutput<typeof UpdateResourceContactSchema>
export type ResourceFilters = {
  contactType?: InferOutput<typeof TradeContactTypeEnum>
  tierGroup?: InferOutput<typeof TierGroupEnum>
}

export const resourcesRepository = {
  async findAll(filters: ResourceFilters = {}) {
    return prisma.resourceContact.findMany({
      where: {
        ...(filters.contactType ? { contactType: filters.contactType } : {}),
        ...(filters.tierGroup ? { tierGroup: filters.tierGroup } : {}),
      },
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.resourceContact.findUnique({ where: { id } })
  },

  async create(data: CreateResourceData) {
    return prisma.resourceContact.create({ data })
  },

  async update(id: number, data: UpdateResourceData) {
    return prisma.resourceContact.update({ where: { id }, data })
  },
}
