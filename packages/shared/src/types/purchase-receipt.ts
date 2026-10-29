import type { Expense } from './expense'

export type PurchaseReceipt = {
  id: number
  purchaseOrderId: number
  purchaseOrder?: { id: number; poNumber: string; supplier?: { id: number; name: string } }
  receiptNumber: string
  vehicleNumber: string | null
  invoiceNumber: string | null
  receivedDate: string
  totalSqfts: number | null
  totalSlabs: number | null
  subtotal: number | null
  adjustment: number | null
  netTotal: number | null
  gstInvoiceSqft: number | null
  gstInvoiceRate: number | null
  gstInvoiceBaseValue: number | null
  gstInvoiceGst: number | null
  gstInvoiceTotal: number | null
  cashPortion: number | null
  billPayment: number | null
  cashPayment: number | null
  remarks: string | null
  isActive: boolean
  items: PurchaseReceiptItem[]
  expenses?: Expense[]
  createdAt: string
  updatedAt: string
}

export type PurchaseReceiptItem = {
  id: number
  purchaseReceiptId: number
  purchaseOrderItemId: number | null
  productVariantId: number
  productVariant?: {
    id: number
    skuCode: string
    product?: { id: number; name: string }
    unit?: { id: number; code: string; name: string }
  }
  batchNo: string
  receivedQty: number
  slabCount: number | null
  damagedQty: number | null
  acceptedQty: number | null
  rejectedQty: number | null
  rate: number | null
  buyingPrice: number
  landingPrice: number | null
  sellingPriceFrom: number | null
  sellingPriceTo: number | null
  widthAllowance: number | null
  heightAllowance: number | null
  remarks: string | null
  isActive: boolean
  slabs?: PurchaseReceiptSlab[]
  inventoryBatch?: InventoryBatchBrief
}

export type PurchaseReceiptSlab = {
  id: number
  purchaseReceiptItemId: number
  serialNo: string | null
  length: number | null
  width: number | null
  thickness: number | null
  sqft: number | null
  isCrack: boolean
  isBroken: boolean
  remarks: string | null
}

export type InventoryBatchBrief = {
  id: number
  batchNo: string
  totalQty: number
  availableQty: number
}

export type CreatePurchaseReceiptDto = {
  purchaseOrderId: number
  vehicleNumber?: string
  invoiceNumber?: string
  receivedDate?: string
  adjustment?: number
  gstInvoiceSqft?: number
  gstInvoiceRate?: number
  billPayment?: number
  cashPayment?: number
  remarks?: string
  items: {
    purchaseOrderItemId?: number
    productVariantId: number
    batchNo: string
    receivedQty: number
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
    remarks?: string
    slabs?: {
      serialNo?: string
      length?: number
      width?: number
      thickness?: number
      sqft?: number
      isCrack?: boolean
      isBroken?: boolean
      remarks?: string
    }[]
  }[]
  expenses?: {
    categoryId: number
    amount: number
    expenseDate?: string
    paymentMode?: string
    referenceNumber?: string
    remarks?: string
  }[]
}
