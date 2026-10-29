import { purchaseOrdersRepository } from './purchase-orders.repository'
import { NotFoundError, ValidationError } from '#/lib/errors'

const PO_STATUSES = ['DRAFT', 'APPROVED', 'PARTIAL_RECEIVED', 'COMPLETED', 'CANCELLED']

export const purchaseOrdersService = {
  async getAll() {
    return purchaseOrdersRepository.findAll()
  },

  async getById(id: number) {
    const po = await purchaseOrdersRepository.findById(id)
    if (!po) throw new NotFoundError('Purchase order')
    return po
  },

  async create(data: {
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
  }) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('At least one item is required')
    }

    const todayCount = await purchaseOrdersRepository.getTodayCount()
    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const seq = String(todayCount + 1).padStart(4, '0')
    const poNumber = `PO-${dateStr}-${seq}`

    return purchaseOrdersRepository.createWithItems({
      poNumber,
      supplierId: data.supplierId,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      status: data.status || 'DRAFT',
      remarks: data.remarks,
      subtotal: data.subtotal,
      totalExpense: data.totalExpense,
      grandTotal: data.grandTotal,
      items: data.items,
    })
  },

  async update(
    id: number,
    data: {
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
    },
  ) {
    await this.getById(id)

    const dbData: Record<string, unknown> = {}
    if (data.supplierId !== undefined) dbData.supplierId = data.supplierId
    if (data.orderDate) dbData.orderDate = new Date(data.orderDate)
    if (data.expectedDate !== undefined) dbData.expectedDate = data.expectedDate ? new Date(data.expectedDate) : null
    if (data.status) {
      if (!PO_STATUSES.includes(data.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${PO_STATUSES.join(', ')}`)
      }
      dbData.status = data.status
    }
    if (data.remarks !== undefined) dbData.remarks = data.remarks
    if (data.subtotal !== undefined) dbData.subtotal = data.subtotal
    if (data.totalExpense !== undefined) dbData.totalExpense = data.totalExpense
    if (data.grandTotal !== undefined) dbData.grandTotal = data.grandTotal

    if (data.items) {
      return purchaseOrdersRepository.updateWithItems(id, {
        ...dbData as any,
        items: data.items,
      })
    }

    return purchaseOrdersRepository.update(id, dbData)
  },

  async delete(id: number) {
    await this.getById(id)
    await purchaseOrdersRepository.delete(id)
  },
}
