import { prisma } from '#/lib/prisma'

export const brokersRepository = {
  async findAll() {
    return prisma.broker.findMany({
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.broker.findUnique({ where: { id } })
  },

  async create(data: {
    name: string
    mobile?: string
    address?: string
    commissionPercent?: number
    isActive?: boolean
  }) {
    return prisma.broker.create({ data })
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      address?: string
      commissionPercent?: number
      isActive?: boolean
    },
  ) {
    return prisma.broker.update({ where: { id }, data })
  },
}
