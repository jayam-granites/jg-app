import { prisma } from '#/lib/prisma'
import type {
  CreateCustomerEnquiryFormData,
  UpdateCustomerEnquiryFormData,
} from '@jg-app/validators'

export const enquiriesRepository = {
  async findAll() {
    return prisma.customerEnquiry.findMany({
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.customerEnquiry.findUnique({ where: { id } })
  },

  async create(data: CreateCustomerEnquiryFormData) {
    return prisma.customerEnquiry.create({ data })
  },

  async update(id: number, data: UpdateCustomerEnquiryFormData) {
    return prisma.customerEnquiry.update({ where: { id }, data })
  },
}
