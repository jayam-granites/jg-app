import { array, minLength, number, object, optional, pipe, string, boolean } from 'valibot'

export const InvoiceItemSchema = object({
  itemType: optional(string()),
  productVariantId: optional(number()),
  inventoryBatchId: optional(number()),
  inventorySlabId: optional(number()),
  description: optional(string()),
  unitId: optional(number()),
  secondaryUnitId: optional(number()),
  qty: number('Qty is required'),
  slabCount: optional(number()),
  isLoadingApplicable: optional(boolean()),
  rate: number('Rate is required'),
  discountAmount: optional(number()),
  taxPercent: optional(number()),
  taxAmount: optional(number()),
  amount: number('Amount is required'),
  remarks: optional(string()),
})

export type InvoiceItemFormData = {
  itemType?: string
  productVariantId?: number
  inventoryBatchId?: number
  inventorySlabId?: number
  description?: string
  unitId?: number
  secondaryUnitId?: number
  qty: number
  slabCount?: number
  isLoadingApplicable?: boolean
  rate: number
  discountAmount?: number
  taxPercent?: number
  taxAmount?: number
  amount: number
  remarks?: string
}

export const CreateInvoiceSchema = object({
  customerId: number('Customer is required'),
  invoiceDate: optional(string()),
  dueDate: optional(string()),
  isGst: optional(boolean()),
  isHalfGst: optional(boolean()),
  isTaxInclusive: optional(boolean()),
  gstPercent: optional(number()),
  loadingRate: optional(number()),
  loadingAmount: optional(number()),
  receivedAmount: optional(number()),
  balanceAmount: optional(number()),
  paymentMethod: optional(string()),
  accountId: optional(number()),
  status: optional(string()),
  transport: optional(object({
    transportProviderId: number(),
    transportDate: optional(string()),
    vehicleNumber: optional(string()),
    fromLocation: optional(string()),
    toLocation: optional(string()),
    amount: number(),
    remarks: optional(string()),
  })),
  discountAmount: optional(number()),
  subtotal: optional(number()),
  taxableAmount: optional(number()),
  cgstAmount: optional(number()),
  sgstAmount: optional(number()),
  igstAmount: optional(number()),
  totalTaxAmount: optional(number()),
  roundOffAmount: optional(number()),
  grandTotal: optional(number()),
  remarks: optional(string()),
  items: pipe(array(InvoiceItemSchema), minLength(1, 'At least one item is required')),
})

export type CreateInvoiceFormData = {
  customerId: number
  invoiceDate?: string
  dueDate?: string
  isGst?: boolean
  isHalfGst?: boolean
  isTaxInclusive?: boolean
  gstPercent?: number
  loadingRate?: number
  loadingAmount?: number
  receivedAmount?: number
  balanceAmount?: number
  paymentMethod?: string
  accountId?: number
  status?: string
  transport?: {
    transportProviderId: number
    transportDate?: string
    vehicleNumber?: string
    fromLocation?: string
    toLocation?: string
    amount: number
    remarks?: string
  }
  discountAmount?: number
  subtotal?: number
  taxableAmount?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  totalTaxAmount?: number
  roundOffAmount?: number
  grandTotal?: number
  remarks?: string
  items: InvoiceItemFormData[]
}

export const UpdateInvoiceSchema = object({
  status: optional(string()),
  dueDate: optional(string()),
  isGst: optional(boolean()),
  isHalfGst: optional(boolean()),
  isTaxInclusive: optional(boolean()),
  gstPercent: optional(number()),
  loadingRate: optional(number()),
  loadingAmount: optional(number()),
  receivedAmount: optional(number()),
  balanceAmount: optional(number()),
  paymentMethod: optional(string()),
  accountId: optional(number()),
  subtotal: optional(number()),
  discountAmount: optional(number()),
  taxableAmount: optional(number()),
  cgstAmount: optional(number()),
  sgstAmount: optional(number()),
  igstAmount: optional(number()),
  totalTaxAmount: optional(number()),
  roundOffAmount: optional(number()),
  grandTotal: optional(number()),
  remarks: optional(string()),
  items: optional(array(InvoiceItemSchema)),
})


export const CreateInvoicePaymentSchema = object({
  amount: number('Payment amount is required'),
  paymentMethod: optional(string()),
  accountId: optional(number()),
  paymentDate: optional(string()),
  remarks: optional(string()),
})

export type CreateInvoicePaymentFormData = {
  amount: number
  paymentMethod?: string
  accountId?: number
  paymentDate?: string
  remarks?: string
}

export const CreateInvoiceCommissionSchema = object({
  brokerId: number('Broker is required'),
  commissionPercent: optional(number()),
  commissionAmount: number('Commission amount is required'),
  remarks: optional(string()),
})

export type CreateInvoiceCommissionFormData = {
  brokerId: number
  commissionPercent?: number
  commissionAmount: number
  remarks?: string
}
