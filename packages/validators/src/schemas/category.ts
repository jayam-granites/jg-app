import { minLength, number, object, optional, pipe, string, picklist, nullable, boolean, array } from 'valibot'

export const CreateCategorySchema = object({
  name: pipe(
    string('Category name must be a string'),
    minLength(2, 'Category name must be at least 2 characters'),
  ),
  type: picklist(
    ['PRODUCT', 'EXPENSE', 'SERVICE', 'PURCHASE'],
    'Category type must be PRODUCT, EXPENSE, SERVICE, or PURCHASE',
  ),
  parentId: optional(nullable(number('Parent category must be a valid number'))),
  isActive: optional(boolean()),
})

export type CreateCategoryFormData = {
  name: string
  type: 'PRODUCT' | 'EXPENSE' | 'SERVICE' | 'PURCHASE'
  parentId?: number | null
  isActive?: boolean
}

export const UpdateCategorySchema = object({
  name: optional(pipe(string('Category name must be a string'), minLength(2, 'Category name must be at least 2 characters'))),
  type: optional(picklist(['PRODUCT', 'EXPENSE', 'SERVICE', 'PURCHASE'], 'Category type must be PRODUCT, EXPENSE, SERVICE, or PURCHASE')),
  parentId: optional(nullable(number('Parent category must be a valid number'))),
  isActive: optional(boolean()),
})

export type UpdateCategoryFormData = {
  name?: string
  type?: 'PRODUCT' | 'EXPENSE' | 'SERVICE' | 'PURCHASE'
  parentId?: number | null
  isActive?: boolean
}

export const LinkCategoryAttributesSchema = object({
  attributes: array(
    object({
      attributeId: number('Attribute ID is required'),
      isRequired: boolean('isRequired must be a boolean'),
    }),
    'attributes must be an array',
  ),
})

export type LinkCategoryAttributesFormData = {
  attributes: { attributeId: number; isRequired: boolean }[]
}
