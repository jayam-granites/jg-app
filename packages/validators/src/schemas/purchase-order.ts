import { array, minLength, number, object, optional, pipe, string } from 'valibot'

export const PurchaseOrderItemSchema = object({
  productVariantId: number('Product variant is required'),
  orderedQty: number('Ordered quantity is required'),
  expectedSlabCount: optional(number()),
  unitPrice: number('Unit price is required'),
  amount: number('Amount is required'),
  remarks: optional(string()),
})

export type PurchaseOrderItemFormData = {
  productVariantId: number
  orderedQty: number
  expectedSlabCount?: number
  unitPrice: number
  amount: number
  remarks?: string
}

export const CreatePurchaseOrderSchema = object({
  supplierId: number('Supplier is required'),
  orderDate: optional(string()),
  expectedDate: optional(string()),
  status: optional(string()),
  remarks: optional(string()),
  subtotal: optional(number()),
  totalExpense: optional(number()),
  grandTotal: optional(number()),
  items: pipe(array(PurchaseOrderItemSchema), minLength(1, 'At least one item is required')),
})

export type CreatePurchaseOrderFormData = {
  supplierId: number
  orderDate?: string
  expectedDate?: string
  status?: string
  remarks?: string
  subtotal?: number
  totalExpense?: number
  grandTotal?: number
  items: PurchaseOrderItemFormData[]
}

export const UpdatePurchaseOrderSchema = object({
  supplierId: optional(number()),
  orderDate: optional(string()),
  expectedDate: optional(string()),
  status: optional(string()),
  remarks: optional(string()),
  subtotal: optional(number()),
  totalExpense: optional(number()),
  grandTotal: optional(number()),
  items: optional(array(PurchaseOrderItemSchema)),
})

export type UpdatePurchaseOrderFormData = {
  supplierId?: number
  orderDate?: string
  expectedDate?: string
  status?: string
  remarks?: string
  subtotal?: number
  totalExpense?: number
  grandTotal?: number
  items?: PurchaseOrderItemFormData[]
}
