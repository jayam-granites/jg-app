import { prisma } from '#/lib/prisma'
import { ConflictError, NotFoundError } from '#/lib/errors'

const batchInclude = {
  productVariant: {
    select: {
      id: true,
      skuCode: true,
      product: { select: { id: true, name: true } },
      unit: { select: { id: true, code: true, name: true } },
      attributes: {
        include: {
          attribute: { select: { id: true, code: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    },
  },
  purchaseReceiptItem: {
    select: {
      id: true,
      batchNo: true,
      purchaseReceipt: {
        select: { id: true, receiptNumber: true, receivedDate: true },
      },
    },
  },
  slabs: {
    where: { isActive: true },
    orderBy: { id: 'desc' },
  },
} as const

export const inventoryRepository = {
  async findAllBatches() {
    return prisma.inventoryBatch.findMany({
      include: batchInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async findBatchById(id: number) {
    return prisma.inventoryBatch.findUnique({
      where: { id },
      include: batchInclude,
    })
  },

  async findBatchesByVariant(variantId: number) {
    return prisma.inventoryBatch.findMany({
      where: { productVariantId: variantId, isActive: true, availableQty: { gt: 0 } },
      include: batchInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async findAvailableBatches() {
    return prisma.inventoryBatch.findMany({
      where: { isActive: true, availableQty: { gt: 0 } },
      include: batchInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async createBatch(data: any) {
    const { slabs, ...batchData } = data
    return prisma.$transaction(async (tx) => {
      const batch = await tx.inventoryBatch.create({
        data: {
          purchaseReceiptItemId: null,
          productVariantId: batchData.productVariantId,
          batchNo: batchData.batchNo,
          slabCount: batchData.slabCount,
          totalQty: batchData.totalQty,
          availableQty: batchData.availableQty,
          damagedQty: batchData.damagedQty,
          buyingPrice: batchData.buyingPrice,
          landingPrice: batchData.landingPrice,
          sellingPriceFrom: batchData.sellingPriceFrom,
          sellingPriceTo: batchData.sellingPriceTo,
          remarks: batchData.remarks,
          isActive: batchData.isActive ?? true,
        },
      })
      if (Array.isArray(slabs) && slabs.length > 0) {
        for (let i = 0; i < slabs.length; i++) {
          const slab = slabs[i]
          await tx.inventorySlab.create({
            data: {
              inventoryBatchId: batch.id,
              serialNo: slab.serialNo || `${batchData.batchNo}-S${i + 1}`,
              length: slab.length ?? null,
              width: slab.width ?? null,
              thickness: slab.thickness ?? null,
              sqft: slab.sqft ?? null,
              isCrack: slab.isCrack ?? false,
              isBroken: slab.isBroken ?? false,
              crackWidth: slab.crackWidth ?? null,
              crackHeight: slab.crackHeight ?? null,
              crackArea: slab.crackArea ?? null,
              remarks: slab.remarks ?? null,
              isActive: true,
            },
          })
        }
      }
      return tx.inventoryBatch.findUnique({ where: { id: batch.id }, include: batchInclude })
    })
  },

  async updateBatch(id: number, data: Record<string, unknown>) {
    return prisma.inventoryBatch.update({
      where: { id },
      data: data as any,
      include: batchInclude,
    })
  },

  async createSlab(data: any) {
    const [slab] = await createSlabsTransaction([data])
    return slab
  },

  async createSlabs(data: any[]) {
    return createSlabsTransaction(data)
  },

  async updateSlab(id: number, data: Record<string, unknown>) {
    return prisma.inventorySlab.update({
      where: { id },
      data: data as any,
    })
  },

  async deleteSlab(id: number) {
    return prisma.$transaction(async (tx) => {
      const slab = await tx.inventorySlab.findUnique({
        where: { id },
        select: {
          id: true,
          inventoryBatchId: true,
          isActive: true,
          isSold: true,
          isBroken: true,
          invoiceItems: { select: { id: true } },
        },
      })
      if (!slab || !slab.isActive) throw new NotFoundError('Inventory slab')
      if (slab.isSold || slab.invoiceItems.length > 0) {
        throw new ConflictError('Sold or invoiced slabs cannot be deleted')
      }

      const batch = await tx.inventoryBatch.findUnique({
        where: { id: slab.inventoryBatchId },
        select: { slabCount: true, totalQty: true, availableQty: true, damagedQty: true },
      })
      if (!batch) throw new NotFoundError('Inventory batch')

      await tx.inventorySlab.update({
        where: { id },
        data: { isActive: false },
      })
      await tx.inventoryBatch.update({
        where: { id: slab.inventoryBatchId },
        data: {
          slabCount: batch.slabCount === null ? null : Math.max(batch.slabCount - 1, 0),
          totalQty: slab.isBroken ? batch.totalQty : Math.max(Number(batch.totalQty) - 1, 0),
          availableQty: slab.isBroken ? batch.availableQty : Math.max(Number(batch.availableQty) - 1, 0),
          damagedQty: slab.isBroken
            ? Math.max(Number(batch.damagedQty ?? 0) - 1, 0)
            : batch.damagedQty,
        },
      })
    })
  },
}

async function createSlabsTransaction(data: any[]) {
  return prisma.$transaction(async (tx) => {
    const slabs = []
    for (const slabData of data) {
      slabs.push(await tx.inventorySlab.create({ data: slabData as any }))
    }

    const batchIds = new Set(data.map((slab) => slab.inventoryBatchId))
    for (const inventoryBatchId of batchIds) {
      const batchSlabCount = data.filter((slab) => slab.inventoryBatchId === inventoryBatchId).length
      const batch = await tx.inventoryBatch.findUnique({
        where: { id: inventoryBatchId },
        select: { slabCount: true },
      })
      if (!batch) throw new NotFoundError('Inventory batch')

      const slabCount = batch.slabCount === null
        ? await tx.inventorySlab.count({
            where: { inventoryBatchId, isActive: true },
          })
        : undefined
      await tx.inventoryBatch.update({
        where: { id: inventoryBatchId },
        data: {
          ...(slabCount === undefined
            ? { slabCount: { increment: batchSlabCount } }
            : { slabCount }),
          totalQty: { increment: batchSlabCount },
          availableQty: { increment: batchSlabCount },
        },
      })
    }
    return slabs
  })
}
