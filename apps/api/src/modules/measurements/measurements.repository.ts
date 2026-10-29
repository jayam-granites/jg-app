import type { Prisma } from '@prisma/client'
import { prisma } from '#/lib/prisma'

const MEASUREMENT_NUMBER_LOCK_KEY = 'measurement_number'

function buildNumberPrefix(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `M-${y}${m}${d}-`
}

async function generateNumberWith(client: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const prefix = buildNumberPrefix(now)

  const existing = await client.measurement.findMany({
    where: { measurementNumber: { startsWith: prefix } },
    select: { measurementNumber: true },
  })

  const maxSeq = existing.reduce((max, { measurementNumber }) => {
    const seq = Number.parseInt(measurementNumber.slice(prefix.length), 10)
    return Number.isFinite(seq) && seq > max ? seq : max
  }, 0)

  return `${prefix}${String(maxSeq + 1).padStart(3, '0')}`
}

export const measurementsRepository = {
  async findAll() {
    return prisma.measurement.findMany({
      include: {
        slabs: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { slabNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.measurement.findUnique({
      where: { id },
      include: {
        slabs: {
          include: { product: { select: { id: true, name: true } } },
          orderBy: { slabNumber: 'asc' },
        },
      },
    })
  },

  async generateNumber(): Promise<string> {
    return generateNumberWith(prisma)
  },

  async createWithGeneratedNumber(data: {
    name: string
    phone?: string | null
    address?: string | null
    notes?: string | null
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${MEASUREMENT_NUMBER_LOCK_KEY}))`
      const measurementNumber = await generateNumberWith(tx)
      return tx.measurement.create({ data: { measurementNumber, ...data } })
    })
  },

  async create(data: {
    measurementNumber: string
    name: string
    phone?: string | null
    address?: string | null
    notes?: string | null
  }) {
    return prisma.measurement.create({ data })
  },

  async update(
    id: number,
    data: {
      name?: string
      phone?: string | null
      address?: string | null
      notes?: string | null
      isActive?: boolean
    },
  ) {
    return prisma.measurement.update({ where: { id }, data })
  },

  async delete(id: number) {
    await prisma.slab.deleteMany({ where: { measurementId: id } })
    return prisma.measurement.delete({ where: { id } })
  },
}
