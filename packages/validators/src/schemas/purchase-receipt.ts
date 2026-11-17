import { array, boolean, minLength, minValue, number, object, optional, picklist, pipe, string } from 'valibot'

export const PurchaseReceiptSlabSchema = object({
  serialNo: optional(string()),
  length: pipe(number('Height is required'), minValue(0.01, 'Height must be greater than zero')),
  width: pipe(number('Width is required'), minValue(0.01, 'Width must be greater than zero')),
  thickness: optional(number()),
  sqft: optional(number()),
  isCrack: optional(boolean()),
  crackWidth: optional(pipe(number(), minValue(0.01, 'Crack width must be greater than zero'))),
  crackHeight: optional(pipe(number(), minValue(0.01, 'Crack height must be greater than zero'))),
  isBroken: optional(boolean()),
  remarks: optional(string()),
})

export type PurchaseReceiptSlabFormData = {
  serialNo?: string
  length?: number
  width?: number
  thickness?: number
  sqft?: number
  isCrack?: boolean
  crackWidth?: number
  crackHeight?: number
  isBroken?: boolean
  remarks?: string
}

export const PurchaseReceiptItemSchema = object({
  purchaseOrderItemId: number('Purchase order item is required'),
  productVariantId: number('Product variant is required'),
  batchNo: optional(string()),
  receivedQty: optional(number()),
  slabCount: optional(number()),
  damagedQty: optional(number()),
  acceptedQty: optional(number()),
  rejectedQty: optional(number()),
  rate: optional(number()),
  buyingPrice: number('Buying price is required'),
  landingPrice: optional(number()),
  sellingPriceFrom: optional(number()),
  sellingPriceTo: optional(number()),
  widthAllowance: optional(number()),
  heightAllowance: optional(number()),
  gstInvoiceSqft: optional(pipe(number(), minValue(0, 'GST invoice sqft cannot be negative'))),
  gstInvoiceRate: optional(pipe(number(), minValue(0, 'GST invoice rate cannot be negative'))),
  remarks: optional(string()),
  slabs: pipe(
    array(PurchaseReceiptSlabSchema),
    minLength(1, 'At least one slab measurement is required'),
  ),
})

export type PurchaseReceiptItemFormData = {
  purchaseOrderItemId: number
  productVariantId: number
  batchNo?: string
  receivedQty?: number
  slabCount?: number
  damagedQty?: number
  acceptedQty?: number
  rejectedQty?: number
  rate?: number
  buyingPrice: number
  landingPrice?: number
  sellingPriceFrom?: number
  sellingPriceTo?: number
  widthAllowance?: number
  heightAllowance?: number
  gstInvoiceSqft?: number
  gstInvoiceRate?: number
  remarks?: string
  slabs: PurchaseReceiptSlabFormData[]
}

export const PurchaseReceiptExpenseSchema = object({
  categoryId: number('Category is required'),
  amount: number('Amount is required'),
  expenseDate: optional(string()),
  paymentMode: optional(string()),
  referenceNumber: optional(string()),
  remarks: optional(string()),
})

export type PurchaseReceiptExpenseFormData = {
  categoryId: number
  amount: number
  expenseDate?: string
  paymentMode?: string
  referenceNumber?: string
  remarks?: string
}

export const CreatePurchaseReceiptSchema = object({
  purchaseOrderId: number('Purchase order is required'),
  vehicleNumber: optional(string()),
  invoiceNumber: optional(string()),
  receivedDate: optional(string()),
  adjustment: optional(number()),
  gstCalculationMode: optional(picklist(['OVERALL', 'PRODUCT'])),
  gstInvoiceSqft: optional(pipe(number(), minValue(0, 'GST invoice sqft cannot be negative'))),
  gstInvoiceRate: optional(pipe(number(), minValue(0, 'GST invoice rate cannot be negative'))),
  billPayment: optional(number()),
  cashPayment: optional(number()),
  remarks: optional(string()),
  items: pipe(array(PurchaseReceiptItemSchema), minLength(1, 'At least one item is required')),
  expenses: optional(array(PurchaseReceiptExpenseSchema)),
})

export type CreatePurchaseReceiptFormData = {
  purchaseOrderId: number
  vehicleNumber?: string
  invoiceNumber?: string
  receivedDate?: string
  adjustment?: number
  gstCalculationMode?: 'OVERALL' | 'PRODUCT'
  gstInvoiceSqft?: number
  gstInvoiceRate?: number
  billPayment?: number
  cashPayment?: number
  remarks?: string
  items: PurchaseReceiptItemFormData[]
  expenses?: PurchaseReceiptExpenseFormData[]
}

export const UpdatePurchaseReceiptSchema = object({
  vehicleNumber: optional(string()),
  invoiceNumber: optional(string()),
  receivedDate: optional(string()),
  adjustment: optional(number()),
  gstInvoiceSqft: optional(number()),
  gstInvoiceRate: optional(number()),
  billPayment: optional(number()),
  cashPayment: optional(number()),
  remarks: optional(string()),
})

export type UpdatePurchaseReceiptFormData = {
  vehicleNumber?: string
  invoiceNumber?: string
  receivedDate?: string
  adjustment?: number
  gstInvoiceSqft?: number
  gstInvoiceRate?: number
  billPayment?: number
  cashPayment?: number
  remarks?: string
}
