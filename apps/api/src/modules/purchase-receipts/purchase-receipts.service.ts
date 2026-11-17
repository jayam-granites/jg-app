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
    gstCalculationMode?: 'OVERALL' | 'PRODUCT'
    gstInvoiceSqft?: number
    gstInvoiceRate?: number
    billPayment?: number
    cashPayment?: number
    remarks?: string
    items: {
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
      slabs: {
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

    const items = data.items.map((item) => {
      const poItem = po.items.find((candidate) => candidate.id === item.purchaseOrderItemId)
      if (!poItem || poItem.productVariantId !== item.productVariantId) {
        throw new ValidationError('Receipt item must match an active item on the selected purchase order')
      }
      if (!item.slabs.length) {
        throw new ValidationError('At least one slab measurement is required for each receipt item')
      }
      if (item.slabs.some((slab) => slab.isCrack
        && (slab.crackWidth === undefined || slab.crackWidth <= 0
          || slab.crackHeight === undefined || slab.crackHeight <= 0))) {
        throw new ValidationError('Crack width and height are required for cracked slabs')
      }
      const damagedQty = item.slabs.filter((slab) => slab.isBroken).length
      const receivedQty = item.slabs.length
      return {
        ...item,
        receivedQty,
        slabCount: receivedQty,
        damagedQty,
        acceptedQty: receivedQty - damagedQty,
        rejectedQty: damagedQty,
        gstInvoiceSqft: item.gstInvoiceSqft,
        gstInvoiceRate: item.gstInvoiceRate,
      }
    })

    return purchaseReceiptsRepository.createWithItems({
      purchaseOrderId: data.purchaseOrderId,
      vehicleNumber: data.vehicleNumber,
      invoiceNumber: data.invoiceNumber,
      receivedDate: data.receivedDate ? new Date(data.receivedDate) : new Date(),
      adjustment: data.adjustment,
      gstCalculationMode: data.gstCalculationMode ?? 'OVERALL',
      gstInvoiceSqft: data.gstInvoiceSqft,
      gstInvoiceRate: data.gstInvoiceRate,
      billPayment: data.billPayment,
      cashPayment: data.cashPayment,
      remarks: data.remarks,
      items,
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
