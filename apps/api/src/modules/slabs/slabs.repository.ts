import { prisma } from '#/lib/prisma'

export const slabsRepository = {
  async findAll() {
    return prisma.slab.findMany({
      include: { product: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async findByProductId(productId: number) {
    return prisma.slab.findMany({
      where: { productId },
      orderBy: { slabNumber: 'asc' },
    })
  },

  async findByMeasurementId(measurementId: number) {
    return prisma.slab.findMany({
      where: { measurementId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { slabNumber: 'asc' },
    })
  },

  async create(data: {
    productId: number
    slabNumber: number
    width: number
    height: number
    area: number
    measurementId?: number
  }) {
    return prisma.slab.create({ data })
  },

  async update(
    id: number,
    data: {
      slabNumber?: number
      width?: number
      height?: number
      area?: number
      isActive?: boolean
    },
  ) {
    return prisma.slab.update({ where: { id }, data })
  },

  async delete(id: number) {
    return prisma.slab.delete({ where: { id } })
  },
}
