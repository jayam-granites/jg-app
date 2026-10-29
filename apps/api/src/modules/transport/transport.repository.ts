import { prisma } from '#/lib/prisma'

export const transportRepository = {
  async findAll() {
    return prisma.transportProvider.findMany({
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.transportProvider.findUnique({ where: { id } })
  },

  async create(data: {
    name: string
    mobile?: string
    vehicleNumber?: string
    address?: string
    isActive?: boolean
  }) {
    return prisma.transportProvider.create({ data })
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      vehicleNumber?: string
      address?: string
      isActive?: boolean
    },
  ) {
    return prisma.transportProvider.update({ where: { id }, data })
  },
}
