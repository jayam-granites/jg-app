export type InventoryBatch = {
  id: number
  purchaseReceiptItemId: number | null
  purchaseReceiptItem?: {
    id: number
    batchNo: string
    purchaseReceipt?: { id: number; receiptNumber: string; receivedDate: string }
  }
  productVariantId: number
  productVariant?: {
    id: number
    skuCode: string
    product?: { id: number; name: string }
    unit?: { id: number; code: string; name: string }
  }
  batchNo: string
  slabCount: number | null
  totalQty: number
  availableQty: number
  damagedQty: number | null
  buyingPrice: number
  landingPrice: number
  sellingPriceFrom: number | null
  sellingPriceTo: number | null
  remarks: string | null
  isActive: boolean
  slabs?: InventorySlab[]
  createdAt: string
  updatedAt: string
}

export type InventorySlab = {
  id: number
  inventoryBatchId: number
  serialNo: string | null
  length: number | null
  width: number | null
  thickness: number | null
  sqft: number | null
  isCrack: boolean
  crackWidth: number | null
  crackHeight: number | null
  crackArea: number | null
  isSold: boolean
  remarks: string | null
  isActive: boolean
}
