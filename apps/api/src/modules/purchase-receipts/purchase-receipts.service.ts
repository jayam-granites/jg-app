import { purchaseReceiptsRepository } from './purchase-receipts.repository'
import { purchaseOrdersRepository } from '../purchase-orders/purchase-orders.repository'
import { NotFoundError, ValidationError } from '#/lib/errors'

export const purchaseReceiptsService = {
  async getAll() {
    return purchaseReceiptsRepository.findAll()
  },

  async getById(id: number) {
    const receipt = await purchaseReceiptsRepository.findById(id)
    if (!receipt) throw new NotFoundError('Purchase receipt')
    return receipt
  },

  async create(data: {
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
      productVariantId: number
      batchNo?: string
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
  }) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('At least one item is required')
    }

    const po = await purchaseOrdersRepository.findById(data.purchaseOrderId)
    if (!po) throw new NotFoundError('Purchase order')

    return purchaseReceiptsRepository.createWithItems({
      purchaseOrderId: data.purchaseOrderId,
      vehicleNumber: data.vehicleNumber,
      invoiceNumber: data.invoiceNumber,
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
      adjustment: data.adjustment,
      gstInvoiceSqft: data.gstInvoiceSqft,
      gstInvoiceRate: data.gstInvoiceRate,
      billPayment: data.billPayment,
      cashPayment: data.cashPayment,
      remarks: data.remarks,
      items: data.items,
      expenses: data.expenses,
    })
  },

  async update(
    id: number,
    data: {
      vehicleNumber?: string
      invoiceNumber?: string
      receivedDate?: string
      adjustment?: number
      gstInvoiceSqft?: number
      gstInvoiceRate?: number
      billPayment?: number
      cashPayment?: number
      remarks?: string
    },
  ) {
    await this.getById(id)
    const dbData: Record<string, unknown> = {}
    if (data.vehicleNumber !== undefined) dbData.vehicleNumber = data.vehicleNumber
    if (data.invoiceNumber !== undefined) dbData.invoiceNumber = data.invoiceNumber
    if (data.receivedDate) dbData.receivedDate = new Date(data.receivedDate)
    if (data.adjustment !== undefined) dbData.adjustment = data.adjustment
    if (data.gstInvoiceSqft !== undefined) dbData.gstInvoiceSqft = data.gstInvoiceSqft
    if (data.gstInvoiceRate !== undefined) dbData.gstInvoiceRate = data.gstInvoiceRate
    if (data.billPayment !== undefined) dbData.billPayment = data.billPayment
    if (data.cashPayment !== undefined) dbData.cashPayment = data.cashPayment
    if (data.remarks !== undefined) dbData.remarks = data.remarks
    return purchaseReceiptsRepository.update(id, dbData)
  },

  async delete(id: number) {
    await this.getById(id)
    await purchaseReceiptsRepository.delete(id)
  },
}
