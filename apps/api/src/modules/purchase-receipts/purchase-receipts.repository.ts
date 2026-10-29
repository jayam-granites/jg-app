import { prisma } from '#/lib/prisma'
import {
  expenseNumberPrefix,
  formatExpenseNumber,
  sequenceFromExpenseNumber,
} from '../expenses/expense-number'

const purchaseReceiptInclude = {
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      supplier: { select: { id: true, name: true } },
    },
  },
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
      slabs: { where: { isActive: true } },
      inventoryBatch: {
        select: { id: true, batchNo: true, totalQty: true, availableQty: true },
      },
    },
  },
  expenses: {
    where: { isActive: true },
    include: {
      category: { select: { id: true, name: true } },
    },
  },
} as const

async function generateBatchNo(tx: any, productVariantId: number): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const count = await tx.purchaseReceiptItem.count({
    where: { productVariantId, createdAt: { gte: new Date(today.setHours(0, 0, 0, 0)) } },
  })
  const seq = String(count + 1).padStart(3, '0')
  return `BAT-${dateStr}-${seq}`
}

function calcSqft(length: number, width: number): number {
  return Math.round((length * width) / 144 * 1000) / 1000
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export const purchaseReceiptsRepository = {
  async findAll() {
    return prisma.purchaseReceipt.findMany({
      include: purchaseReceiptInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.purchaseReceipt.findUnique({
      where: { id },
      include: purchaseReceiptInclude,
    })
  },

  async getTodayCount() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return prisma.purchaseReceipt.count({ where: { createdAt: { gte: today } } })
  },

  async createWithItems(data: {
    receiptNumber?: string
    purchaseOrderId: number
    vehicleNumber?: string
    invoiceNumber?: string
    receivedDate: Date
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
    return prisma.$transaction(async (tx) => {
      let totalSqfts = 0
      let totalSlabs = 0
      let receiptSubtotal = 0

      const receiptNumber = data.receiptNumber ?? await (async () => {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const prefix = `PR-${dateStr}-`
        const last = await tx.purchaseReceipt.findFirst({
          where: { receiptNumber: { startsWith: prefix } },
          orderBy: { receiptNumber: 'desc' },
          select: { receiptNumber: true },
        })
        const nextSeq = last ? parseInt(last.receiptNumber.slice(-4)) + 1 : 1
        const seq = String(nextSeq).padStart(4, '0')
        return `${prefix}${seq}`
      })()

      const receipt = await tx.purchaseReceipt.create({
        data: {
          receiptNumber,
          purchaseOrderId: data.purchaseOrderId,
          vehicleNumber: data.vehicleNumber ?? null,
          invoiceNumber: data.invoiceNumber ?? null,
          receivedDate: data.receivedDate,
          adjustment: data.adjustment ?? null,
          gstInvoiceSqft: data.gstInvoiceSqft ?? null,
          gstInvoiceRate: data.gstInvoiceRate ?? null,
          billPayment: data.billPayment ?? null,
          cashPayment: data.cashPayment ?? null,
          remarks: data.remarks ?? null,
        },
      })

      const receiptItems: Array<Record<string, any>> = []
      const itemAllocations: Record<number, number> = {}

      for (const item of data.items) {
        const acceptedQty = item.acceptedQty ?? item.receivedQty
        const damagedQty = item.damagedQty ?? 0
        const rejectedQty = item.rejectedQty ?? 0
        const batchNo = item.batchNo ?? (await generateBatchNo(tx, item.productVariantId))

        const receiptItem = await tx.purchaseReceiptItem.create({
          data: {
            purchaseReceiptId: receipt.id,
            productVariantId: item.productVariantId,
            batchNo,
            receivedQty: item.receivedQty,
            slabCount: item.slabCount ?? null,
            damagedQty,
            acceptedQty,
            rejectedQty,
            rate: item.rate ?? null,
            buyingPrice: item.buyingPrice,
            landingPrice: item.buyingPrice,
            widthAllowance: item.widthAllowance ?? null,
            heightAllowance: item.heightAllowance ?? null,
            remarks: item.remarks ?? null,
          },
        })

        let itemTotalSqft = 0
        let itemSlabCount = 0
        const createdSlabs: Array<Record<string, any>> = []

        if (item.slabs && item.slabs.length > 0) {
          for (let i = 0; i < item.slabs.length; i++) {
            const slab = item.slabs[i]
            const slabSqft = slab.sqft ?? (slab.length && slab.width ? calcSqft(slab.length, slab.width) : null)
            const serialNo = slab.serialNo ?? null

            const createdSlab = await tx.purchaseReceiptSlab.create({
              data: {
                purchaseReceiptItemId: receiptItem.id,
                serialNo,
                length: slab.length ?? null,
                width: slab.width ?? null,
                thickness: slab.thickness ?? null,
                sqft: slabSqft,
                isCrack: slab.isCrack ?? false,
                isBroken: slab.isBroken ?? false,
                remarks: slab.remarks ?? null,
              },
            })

            itemTotalSqft += Number(slabSqft ?? 0)
            itemSlabCount++
            createdSlabs.push(createdSlab)
          }
        }

        totalSqfts += itemTotalSqft
        totalSlabs += itemSlabCount

        const slabCount = item.slabCount ?? itemSlabCount
        const rate = item.rate ?? item.buyingPrice
        const itemSubtotal = itemTotalSqft > 0
          ? round2(itemTotalSqft * rate)
          : round2(Number(acceptedQty) * Number(item.buyingPrice))
        receiptSubtotal += itemSubtotal

        const inventoryBatch = await tx.inventoryBatch.create({
          data: {
            purchaseReceiptItemId: receiptItem.id,
            productVariantId: item.productVariantId,
            batchNo,
            slabCount: slabCount,
            totalQty: acceptedQty,
            availableQty: acceptedQty,
            damagedQty,
            buyingPrice: item.buyingPrice,
            landingPrice: item.buyingPrice,
          },
        })

        if (createdSlabs.length > 0) {
          for (const slab of createdSlabs) {
            await tx.inventorySlab.create({
              data: {
                inventoryBatchId: inventoryBatch.id,
                serialNo: slab.serialNo,
                length: slab.length,
                width: slab.width,
                thickness: slab.thickness,
                sqft: slab.sqft,
                remarks: slab.remarks,
              },
            })
          }
        }

        receiptItems.push({
          ...receiptItem,
          acceptedQty,
          buyingPrice: item.buyingPrice,
          inventoryBatch: { id: inventoryBatch.id, batchNo, totalQty: inventoryBatch.totalQty, availableQty: inventoryBatch.availableQty },
          slabs: createdSlabs,
        })
        itemAllocations[receiptItem.id] = 0
      }

      // Granite billing calculation
      const adjustment = data.adjustment ?? 0
      const netTotal = round2(receiptSubtotal - adjustment)

      const gstInvoiceSqft = data.gstInvoiceSqft ?? 0
      const gstInvoiceRate = data.gstInvoiceRate ?? 0
      const gstInvoiceBaseValue = gstInvoiceSqft > 0 && gstInvoiceRate > 0
        ? round2(gstInvoiceSqft * gstInvoiceRate)
        : 0
      const gstInvoiceGst = gstInvoiceBaseValue > 0
        ? round2(gstInvoiceBaseValue * 0.18)
        : 0
      const gstInvoiceTotal = round2(gstInvoiceBaseValue + gstInvoiceGst)

      const cashPortion = round2(netTotal - gstInvoiceTotal)

      // Default billPayment to gstInvoiceTotal, cashPayment to cashPortion
      const billPayment = data.billPayment ?? gstInvoiceTotal
      const cashPayment = data.cashPayment ?? cashPortion

      await tx.purchaseReceipt.update({
        where: { id: receipt.id },
        data: {
          totalSqfts,
          totalSlabs,
          subtotal: receiptSubtotal,
          adjustment,
          netTotal,
          gstInvoiceSqft,
          gstInvoiceRate,
          gstInvoiceBaseValue,
          gstInvoiceGst,
          gstInvoiceTotal,
          cashPortion,
          billPayment,
          cashPayment,
        },
      })

      if (data.expenses && data.expenses.length > 0) {
        const totalAccepted = receiptItems.reduce((sum, item) => sum + Number(item.acceptedQty), 0)
        for (let ei = 0; ei < data.expenses.length; ei++) {
          const exp = data.expenses[ei]
          const expenseDate = exp.expenseDate ? new Date(exp.expenseDate) : new Date()
          const prefix = expenseNumberPrefix(expenseDate)
          const latest = await tx.expense.findFirst({
            where: { expenseNumber: { startsWith: prefix } },
            orderBy: { expenseNumber: 'desc' },
            select: { expenseNumber: true },
          })
          const lastSequence = latest ? sequenceFromExpenseNumber(latest.expenseNumber, prefix) : 0
          const expense = await tx.expense.create({
            data: {
              expenseNumber: formatExpenseNumber(expenseDate, lastSequence + 1),
              expenseDate,
              categoryId: exp.categoryId,
              purchaseReceiptId: receipt.id,
              amount: exp.amount,
              paymentMode: exp.paymentMode ?? null,
              referenceNumber: exp.referenceNumber ?? null,
              remarks: exp.remarks ?? null,
              isPurchaseExpense: true,
            },
          })

          if (totalAccepted > 0) {
            let allocated = 0
            for (let i = 0; i < receiptItems.length; i++) {
              const item = receiptItems[i]
              const itemQty = Number(item.acceptedQty)
              const isLast = i === receiptItems.length - 1
              const allocAmount = isLast
                ? Number(exp.amount) - allocated
                : Math.round((itemQty / totalAccepted) * Number(exp.amount) * 100) / 100
              allocated += allocAmount
              if (allocAmount > 0) {
                await tx.expenseAllocation.create({
                  data: {
                    expenseId: expense.id,
                    purchaseReceiptItemId: item.id,
                    amount: allocAmount,
                  },
                })
                itemAllocations[item.id] = (itemAllocations[item.id] ?? 0) + allocAmount
              }
            }
          }
        }
      }

      for (const item of receiptItems) {
        const qty = Number(item.acceptedQty)
        const buyingPrice = Number(item.buyingPrice)
        const allocatedExpense = itemAllocations[item.id] ?? 0
        const landingPrice = qty > 0 ? round2(((buyingPrice * qty) + allocatedExpense) / qty) : buyingPrice
        const sellingPriceFrom = round2(landingPrice * 1.10)
        const sellingPriceTo = round2(landingPrice * 1.30)

        await tx.purchaseReceiptItem.update({
          where: { id: item.id },
          data: { landingPrice, sellingPriceFrom, sellingPriceTo },
        })

        await tx.inventoryBatch.update({
          where: { id: item.inventoryBatch.id },
          data: { landingPrice, sellingPriceFrom, sellingPriceTo },
        })

        item.landingPrice = landingPrice
        item.sellingPriceFrom = sellingPriceFrom
        item.sellingPriceTo = sellingPriceTo
        item.inventoryBatch.landingPrice = landingPrice
        item.inventoryBatch.sellingPriceFrom = sellingPriceFrom
        item.inventoryBatch.sellingPriceTo = sellingPriceTo
      }

      const po = await tx.purchaseOrder.findUnique({
        where: { id: data.purchaseOrderId },
        include: { items: { where: { isActive: true } } },
      })

      if (po) {
        const totalOrdered = po.items.reduce((sum, i) => sum + Number(i.orderedQty), 0)
        const totalReceived = data.items.reduce((sum, i) => sum + Number(i.receivedQty), 0)

        let newStatus = 'PARTIAL_RECEIVED'
        if (totalReceived >= totalOrdered) {
          newStatus = 'COMPLETED'
        }

        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: newStatus as any },
        })
      }

      return {
        ...receipt,
        totalSqfts,
        totalSlabs,
        subtotal: receiptSubtotal,
        adjustment,
        netTotal,
        gstInvoiceSqft,
        gstInvoiceRate,
        gstInvoiceBaseValue,
        gstInvoiceGst,
        gstInvoiceTotal,
        cashPortion,
        billPayment,
        cashPayment,
        items: receiptItems,
      }
    })
  },

  async update(id: number, data: Record<string, unknown>) {
    return prisma.purchaseReceipt.update({
      where: { id },
      data: data as any,
      include: purchaseReceiptInclude,
    })
  },

  async delete(id: number) {
    return prisma.purchaseReceipt.delete({ where: { id } })
  },
}
