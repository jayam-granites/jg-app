import { array, minLength, nullable, number, object, optional, pipe, string } from 'valibot'

export const CreateProductSchema = object({
  name: pipe(string(), minLength(1, 'Product name is required')),
  categoryId: number('Category is required'),
  description: optional(string()),
  hsnCode: optional(string()),
  lotNumber: optional(string()),
  widthReduction: optional(number()),
  variants: pipe(
    array(
      object({
        skuCode: pipe(string(), minLength(1, 'SKU code is required')),
        unitId: number('Unit is required'),
        secondaryUnitId: optional(nullable(number())),
        attributes: optional(
          array(
            object({
              attributeId: number(),
              attributeValueId: number(),
            }),
          ),
        ),
      }),
    ),
    minLength(1, 'At least one variant is required'),
  ),
})

export const UpdateProductSchema = object({
  name: pipe(string(), minLength(1, 'Product name is required')),
  categoryId: number('Category is required'),
  description: optional(string()),
  hsnCode: optional(string()),
  lotNumber: optional(string()),
  widthReduction: optional(number()),
  variants: pipe(
    array(
      object({
        id: optional(number()),
        skuCode: pipe(string(), minLength(1, 'SKU code is required')),
        unitId: number('Unit is required'),
        secondaryUnitId: optional(nullable(number())),
        attributes: optional(
          array(
            object({
              id: optional(number()),
              attributeId: number(),
              attributeValueId: number(),
            }),
          ),
        ),
      }),
    ),
    minLength(1, 'At least one variant is required'),
  ),
})

export type CreateProductFormData = {
  name: string
  categoryId: number
  description?: string
  hsnCode?: string
  lotNumber?: string
  variants: {
    skuCode: string
    unitId: number
    secondaryUnitId?: number
    attributes?: { attributeId: number; attributeValueId: number }[]
  }[]
}
