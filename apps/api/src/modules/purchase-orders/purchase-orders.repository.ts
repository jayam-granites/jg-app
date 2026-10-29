import { prisma } from '#/lib/prisma'

const purchaseOrderInclude = {
  supplier: { select: { id: true, name: true } },
  items: {
    where: { isActive: true },
    include: {
      productVariant: {
        select: {
          id: true,
          skuCode: true,
          product: { select: { id: true, name: true } },
          unit: { select: { id: true, code: true, name: true } },
        },
      },
    },
  },
  receipts: {
    where: { isActive: true },
    select: { id: true, receiptNumber: true },
  },
} as const

export const purchaseOrdersRepository = {
  async findAll() {
    return prisma.purchaseOrder.findMany({
      include: purchaseOrderInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.purchaseOrder.findUnique({
      where: { id },
      include: purchaseOrderInclude,
    })
  },

  async getTodayCount() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.purchaseOrder.count({ where: { createdAt: { gte: today } } })
  },

  async createWithItems(data: {
    poNumber: string
    supplierId: number
    orderDate: Date
    expectedDate?: Date
    status: string
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
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: data.poNumber,
          supplierId: data.supplierId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate ?? null,
          status: data.status as any,
          remarks: data.remarks ?? null,
          subtotal: data.subtotal ?? null,
          totalExpense: data.totalExpense ?? null,
          grandTotal: data.grandTotal ?? null,
          items: {
            create: data.items.map((item) => ({
              productVariantId: item.productVariantId,
              orderedQty: item.orderedQty,
              expectedSlabCount: item.expectedSlabCount ?? null,
              unitPrice: item.unitPrice,
              amount: item.amount,
              remarks: item.remarks ?? null,
            })),
          },
        },
        include: purchaseOrderInclude,
      })
      return po
    })
  },

  async update(id: number, data: Record<string, unknown>) {
    return prisma.purchaseOrder.update({
      where: { id },
      data: data as any,
      include: purchaseOrderInclude,
    })
  },

  async updateWithItems(
    id: number,
    data: {
      supplierId?: number
      orderDate?: Date
      expectedDate?: Date | null
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
    return prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: data.supplierId,
          orderDate: data.orderDate,
          expectedDate: data.expectedDate,
          status: data.status as any,
          remarks: data.remarks,
          subtotal: data.subtotal,
          totalExpense: data.totalExpense,
          grandTotal: data.grandTotal,
        },
      })

      if (data.items) {
        const existingIds = (
          await tx.purchaseOrderItem.findMany({
            where: { purchaseOrderId: id, isActive: true },
            select: { id: true },
          })
        ).map((i) => i.id)

        const incomingIds = data.items.filter((i) => i.id).map((i) => i.id!)
        const toDelete = existingIds.filter((eid) => !incomingIds.includes(eid))

        if (toDelete.length > 0) {
          await tx.purchaseOrderItem.updateMany({
            where: { id: { in: toDelete } },
            data: { isActive: false },
          })
        }

        for (const item of data.items) {
          if (item.id) {
            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: {
                productVariantId: item.productVariantId,
                orderedQty: item.orderedQty,
                expectedSlabCount: item.expectedSlabCount ?? null,
                unitPrice: item.unitPrice,
                amount: item.amount,
                remarks: item.remarks ?? null,
              },
            })
          } else {
            await tx.purchaseOrderItem.create({
              data: {
                purchaseOrderId: id,
                productVariantId: item.productVariantId,
                orderedQty: item.orderedQty,
                expectedSlabCount: item.expectedSlabCount ?? null,
                unitPrice: item.unitPrice,
                amount: item.amount,
                remarks: item.remarks ?? null,
              },
            })
          }
        }
      }

      return tx.purchaseOrder.findUnique({
        where: { id },
        include: purchaseOrderInclude,
      })
    })
  },

  async delete(id: number) {
    return prisma.purchaseOrder.delete({ where: { id } })
  },
}
