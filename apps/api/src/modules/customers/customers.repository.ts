import { prisma } from '#/lib/prisma'

export const customersRepository = {
  async findAll() {
    return prisma.customer.findMany({ orderBy: { createdAt: 'desc' } })
  },

  async findById(id: number) {
    return prisma.customer.findUnique({ where: { id } })
  },

  async create(data: {
    name: string
    mobile?: string
    alternateMobile?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    gstNumber?: string
  }) {
    return prisma.customer.create({ data })
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      alternateMobile?: string
      address?: string
      city?: string
      state?: string
      pincode?: string
      gstNumber?: string
      isActive?: boolean
    },
  ) {
    return prisma.customer.update({ where: { id }, data })
  },

  async delete(id: number) {
    return prisma.customer.delete({ where: { id } })
  },
}
