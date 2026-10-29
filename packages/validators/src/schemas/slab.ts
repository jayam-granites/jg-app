import { number, object, optional, boolean } from 'valibot'

export const CreateSlabSchema = object({
  productId: number('Product is required'),
  measurementId: optional(number()),
  slabNumber: number('Slab number is required'),
  width: number('Width is required'),
  height: number('Height is required'),
  area: number('Area is required'),
})

export type CreateSlabFormData = {
  productId: number
  measurementId?: number
  slabNumber: number
  width: number
  height: number
  area: number
}

export const UpdateSlabSchema = object({
  slabNumber: optional(number('Slab number is required')),
  width: optional(number('Width is required')),
  height: optional(number('Height is required')),
  area: optional(number('Area is required')),
  isActive: optional(boolean()),
})

export type UpdateSlabFormData = {
  slabNumber?: number
  width?: number
  height?: number
  area?: number
  isActive?: boolean
}

export const UpdateProductWidthReductionSchema = object({
  widthReduction: optional(number()),
})

export type UpdateProductWidthReductionFormData = {
  widthReduction?: number
}
