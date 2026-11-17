import { prisma } from '#/lib/prisma'
import type {
  CreateResourceContactFormData,
  UpdateResourceContactFormData,
} from '@jg-app/validators'

export const resourcesRepository = {
  async findAll() {
    return prisma.resourceContact.findMany({ orderBy: { name: 'asc' } })
  },

  async findById(id: number) {
    return prisma.resourceContact.findUnique({ where: { id } })
  },

  async create(data: CreateResourceContactFormData) {
    return prisma.resourceContact.create({ data })
  },

  async update(id: number, data: UpdateResourceContactFormData) {
    return prisma.resourceContact.update({ where: { id }, data })
  },
}
