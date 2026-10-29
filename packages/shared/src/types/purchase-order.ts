export type PurchaseOrder = {
  id: number
  poNumber: string
  supplierId: number
  supplier?: { id: number; name: string }
  orderDate: string
  expectedDate: string | null
  status: string
  remarks: string | null
  subtotal: number | null
  totalExpense: number | null
  grandTotal: number | null
  isActive: boolean
  items: PurchaseOrderItem[]
  receipts?: { id: number; receiptNumber: string }[]
  createdAt: string
  updatedAt: string
}

export type PurchaseOrderItem = {
  id: number
  purchaseOrderId: number
  productVariantId: number
  productVariant?: {
    id: number
    skuCode: string
    product?: { id: number; name: string }
    unit?: { id: number; code: string; name: string }
  }
  orderedQty: number
  expectedSlabCount: number | null
  unitPrice: number
  amount: number
  remarks: string | null
  isActive: boolean
}

export type CreatePurchaseOrderDto = {
  supplierId: number
  orderDate?: string
  expectedDate?: string
  status?: string
  remarks?: string
  subtotal?: number
  totalExpense?: number
  grandTotal?: number
  items: {
    productVariantId: number
    orderedQty: number
    expectedSlabCount?: number
    unitPrice: number
    amount: number
    remarks?: string
  }[]
}

export type UpdatePurchaseOrderDto = {
  supplierId?: number
  orderDate?: string
  expectedDate?: string
  status?: string
  remarks?: string
  subtotal?: number
  totalExpense?: number
  grandTotal?: number
  items?: {
    id?: number
    productVariantId: number
    orderedQty: number
    expectedSlabCount?: number
    unitPrice: number
    amount: number
    remarks?: string
  }[]
}
