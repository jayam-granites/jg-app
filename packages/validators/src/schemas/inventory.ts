import { array, boolean, minLength, minValue, number, object, optional, pipe, string } from 'valibot'

export const InventorySlabCreateSchema = object({
  serialNo: optional(string()),
  length: optional(number()),
  width: optional(number()),
  thickness: optional(number()),
  sqft: optional(number()),
  isCrack: optional(boolean()),
  isBroken: optional(boolean()),
  crackWidth: optional(number()),
  crackHeight: optional(number()),
  crackArea: optional(number()),
  remarks: optional(string()),
})

export type InventorySlabCreateFormData = {
  serialNo?: string
  length?: number
  width?: number
  thickness?: number
  sqft?: number
  isCrack?: boolean
  isBroken?: boolean
  crackWidth?: number
  crackHeight?: number
  crackArea?: number
  remarks?: string
}

export const CreateInventorySlabSchema = object({
  inventoryBatchId: number('Inventory batch is required'),
  serialNo: optional(string()),
  length: pipe(number('Height is required'), minValue(0.01, 'Height must be greater than zero')),
  width: pipe(number('Width is required'), minValue(0.01, 'Width must be greater than zero')),
  thickness: optional(number()),
  sqft: optional(number()),
  isCrack: optional(boolean()),
  isBroken: optional(boolean()),
  crackWidth: optional(number()),
  crackHeight: optional(number()),
  crackArea: optional(number()),
  remarks: optional(string()),
})

export const CreateInventorySlabsSchema = pipe(
  array(CreateInventorySlabSchema),
  minLength(1, 'At least one slab is required'),
)

export const CreateInventoryBatchSchema = object({
  productVariantId: number('Product variant is required'),
  batchNo: optional(string()),
  slabCount: optional(number()),
  totalQty: optional(number()),
  availableQty: optional(number()),
  damagedQty: optional(number()),
  buyingPrice: number('Buying price is required'),
  landingPrice: number('Landing price is required'),
  sellingPriceFrom: number('Min selling price is required'),
  sellingPriceTo: number('Max selling price is required'),
  remarks: optional(string()),
  isActive: optional(boolean()),
  slabs: optional(array(InventorySlabCreateSchema)),
})

export type CreateInventoryBatchFormData = {
  productVariantId: number
  batchNo?: string
  slabCount?: number
  totalQty?: number
  availableQty?: number
  damagedQty?: number
  buyingPrice: number
  landingPrice: number
  sellingPriceFrom: number
  sellingPriceTo: number
  remarks?: string
  isActive?: boolean
  slabs?: InventorySlabCreateFormData[]
}

export const UpdateInventoryBatchSchema = object({
  sellingPriceFrom: optional(number()),
  sellingPriceTo: optional(number()),
  buyingPrice: optional(number()),
  landingPrice: optional(number()),
  remarks: optional(string()),
  isActive: optional(boolean()),
  slabCount: optional(number()),
  totalQty: optional(number()),
  availableQty: optional(number()),
  damagedQty: optional(number()),
})

export type UpdateInventoryBatchFormData = {
  sellingPriceFrom?: number
  sellingPriceTo?: number
  buyingPrice?: number
  landingPrice?: number
  remarks?: string
  isActive?: boolean
  slabCount?: number
  totalQty?: number
  availableQty?: number
  damagedQty?: number
}

export const UpdateInventorySlabSchema = object({
  serialNo: optional(string()),
  length: optional(number()),
  width: optional(number()),
  thickness: optional(number()),
  sqft: optional(number()),
  isSold: optional(boolean()),
  remarks: optional(string()),
  isCrack: optional(boolean()),
  crackWidth: optional(number()),
  crackHeight: optional(number()),
  crackArea: optional(number()),
})

export type UpdateInventorySlabFormData = {
  serialNo?: string
  length?: number
  width?: number
  thickness?: number
  sqft?: number
  isSold?: boolean
  remarks?: string
  isCrack?: boolean
  crackWidth?: number
  crackHeight?: number
  crackArea?: number
}
