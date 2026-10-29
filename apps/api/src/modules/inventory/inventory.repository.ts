import { prisma } from '#/lib/prisma'

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
    orderBy: { id: 'asc' },
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
    return prisma.inventorySlab.create({
      data: data as any,
    })
  },

  async updateSlab(id: number, data: Record<string, unknown>) {
    return prisma.inventorySlab.update({
      where: { id },
      data: data as any,
    })
  },
}
