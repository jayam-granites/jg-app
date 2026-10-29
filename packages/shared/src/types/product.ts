export type Product = {
  id: number
  name: string
  categoryId: number
  category?: CategoryBrief
  description: string | null
  hsnCode: string | null
  lotNumber: string | null
  widthReduction: number | null
  isActive: boolean
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export type ProductVariant = {
  id: number
  productId: number
  unitId: number
  unit?: UnitBrief
  secondaryUnitId: number | null
  secondaryUnit?: UnitBrief | null
  skuCode: string
  isActive: boolean
  attributes: ProductVariantAttribute[]
}

export type ProductVariantAttribute = {
  id: number
  productVariantId: number
  attributeId: number
  attribute?: AttributeBrief
  attributeValueId: number
  attributeValue?: AttributeValueBrief
}

export type CategoryBrief = {
  id: number
  name: string
}

export type UnitBrief = {
  id: number
  code: string
  name: string
}

export type AttributeBrief = {
  id: number
  code: string
  name: string
}

export type AttributeValueBrief = {
  id: number
  value: string
}

export type UpdateProductDto = {
  name: string
  categoryId: number
  description?: string | null
  hsnCode?: string | null
  lotNumber?: string | null
  widthReduction?: number | null
  variants: {
    id?: number
    skuCode: string
    unitId: number
    secondaryUnitId?: number | null
    attributes?: {
      id?: number
      attributeId: number
      attributeValueId: number
    }[]
  }[]
}

export type CreateProductDto = {
  name: string
  categoryId: number
  description?: string
  hsnCode?: string
  lotNumber?: string
  widthReduction?: number | null
  variants: {
    skuCode: string
    unitId: number
    secondaryUnitId?: number | null
    attributes?: {
      attributeId: number
      attributeValueId: number
    }[]
  }[]
}
