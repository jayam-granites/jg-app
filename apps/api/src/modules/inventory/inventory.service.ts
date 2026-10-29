import { inventoryRepository } from './inventory.repository'
import { NotFoundError } from '#/lib/errors'

export const inventoryService = {
  async getAll() {
    return inventoryRepository.findAllBatches()
  },

  async getAvailable() {
    return inventoryRepository.findAvailableBatches()
  },

  async getBatchById(id: number) {
    const batch = await inventoryRepository.findBatchById(id)
    if (!batch) throw new NotFoundError('Inventory batch')
    return batch
  },

  async getByVariant(variantId: number) {
    return inventoryRepository.findBatchesByVariant(variantId)
  },

  async createBatch(data: any) {
    const payload = {
      productVariantId: data.productVariantId,
      batchNo: data.batchNo || `BAT-${Date.now()}`,
      slabCount: data.slabCount ?? (data.slabs?.length ?? null),
      totalQty: data.totalQty ?? data.slabs?.length ?? 0,
      availableQty: data.availableQty ?? data.totalQty ?? data.slabs?.length ?? 0,
      damagedQty: data.damagedQty ?? null,
      buyingPrice: data.buyingPrice,
      landingPrice: data.landingPrice,
      sellingPriceFrom: data.sellingPriceFrom ?? null,
      sellingPriceTo: data.sellingPriceTo ?? null,
      remarks: data.remarks ?? null,
      isActive: data.isActive ?? true,
      slabs: data.slabs,
    }
    return inventoryRepository.createBatch(payload)
  },

  async updateBatch(id: number, data: any) {
    await this.getBatchById(id)
    const dbData: Record<string, unknown> = {}
    if (data.sellingPriceFrom !== undefined) dbData.sellingPriceFrom = data.sellingPriceFrom
    if (data.sellingPriceTo !== undefined) dbData.sellingPriceTo = data.sellingPriceTo
    if (data.buyingPrice !== undefined) dbData.buyingPrice = data.buyingPrice
    if (data.landingPrice !== undefined) dbData.landingPrice = data.landingPrice
    if (data.remarks !== undefined) dbData.remarks = data.remarks
    if (data.isActive !== undefined) dbData.isActive = data.isActive
    if (data.slabCount !== undefined) dbData.slabCount = data.slabCount
    if (data.totalQty !== undefined) dbData.totalQty = data.totalQty
    if (data.availableQty !== undefined) dbData.availableQty = data.availableQty
    if (data.damagedQty !== undefined) dbData.damagedQty = data.damagedQty
    return inventoryRepository.updateBatch(id, dbData)
  },

  async createSlab(data: any) {
    return inventoryRepository.createSlab({
      inventoryBatchId: data.inventoryBatchId,
      serialNo: data.serialNo,
      length: data.length ?? null,
      width: data.width ?? null,
      thickness: data.thickness ?? null,
      sqft: data.sqft ?? null,
      isCrack: data.isCrack ?? false,
      crackWidth: data.crackWidth ?? null,
      crackHeight: data.crackHeight ?? null,
      crackArea: data.crackArea ?? null,
      remarks: data.remarks ?? null,
    })
  },

  async updateSlab(id: number, data: any) {
    const dbData: Record<string, unknown> = {}
    if (data.serialNo !== undefined) dbData.serialNo = data.serialNo
    if (data.length !== undefined) dbData.length = data.length
    if (data.width !== undefined) dbData.width = data.width
    if (data.thickness !== undefined) dbData.thickness = data.thickness
    if (data.sqft !== undefined) dbData.sqft = data.sqft
    if (data.isSold !== undefined) dbData.isSold = data.isSold
    if (data.remarks !== undefined) dbData.remarks = data.remarks
    if (data.isCrack !== undefined) dbData.isCrack = data.isCrack
    if (data.crackWidth !== undefined) dbData.crackWidth = data.crackWidth
    if (data.crackHeight !== undefined) dbData.crackHeight = data.crackHeight
    if (data.crackArea !== undefined) dbData.crackArea = data.crackArea
    return inventoryRepository.updateSlab(id, dbData)
  },
}
