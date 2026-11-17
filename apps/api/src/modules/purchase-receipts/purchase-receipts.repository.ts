import { prisma } from '#/lib/prisma'
import {
  expenseNumberPrefix,
  formatExpenseNumber,
  sequenceFromExpenseNumber,
} from '../expenses/expense-number'
import { SETTINGS_KEYS } from '@jg-app/shared'
import { calculateReceiptBilling } from '@jg-app/shared'

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

function calcSqft(length: number, width: number, widthAllowance = 0, heightAllowance = 0): number {
  return Math.round(((length + heightAllowance) * (width + widthAllowance)) / 144 * 1000) / 1000
}

function calcCrackArea(width: number, height: number): number {
  return Math.round((width * height) / 144 * 1000) / 1000
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
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
    return prisma.$transaction(async (tx) => {
      let totalSqfts = 0
      let totalSlabs = 0
      let receiptSubtotal = 0
      const lineSubtotals: number[] = []
      const gstCalculationMode = data.gstCalculationMode ?? 'OVERALL'

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
          gstCalculationMode,
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
            purchaseOrderItemId: item.purchaseOrderItemId,
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

        if (item.slabs.length > 0) {
          for (let i = 0; i < item.slabs.length; i++) {
            const slab = item.slabs[i]
            const crackArea = slab.isCrack && slab.crackWidth && slab.crackHeight
              ? calcCrackArea(slab.crackWidth, slab.crackHeight)
              : null
            const baseSqft = slab.length && slab.width
              ? calcSqft(slab.length, slab.width, item.widthAllowance ?? 0, item.heightAllowance ?? 0)
              : null
            const slabSqft = baseSqft === null
              ? null
              : round3(Math.max(baseSqft - (crackArea ?? 0), 0))
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
                crackWidth: slab.isCrack ? slab.crackWidth ?? null : null,
                crackHeight: slab.isCrack ? slab.crackHeight ?? null : null,
                crackArea,
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
        lineSubtotals.push(itemSubtotal)

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
                isCrack: slab.isCrack,
                isBroken: slab.isBroken,
                crackWidth: slab.crackWidth,
                crackHeight: slab.crackHeight,
                crackArea: slab.crackArea,
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

      const adjustment = data.adjustment ?? 0
      const gstSetting = await tx.setting.findUnique({
        where: { key: SETTINGS_KEYS.INVOICE_GST_PERCENT },
        select: { value: true },
      })
      const configuredGstPercentage = Number(gstSetting?.value)
      const gstPercentage = Number.isFinite(configuredGstPercentage) && configuredGstPercentage >= 0
        ? configuredGstPercentage
        : 18
      const billing = calculateReceiptBilling({
        mode: gstCalculationMode,
        lines: data.items.map((item, index) => ({
          subtotal: lineSubtotals[index],
          gstInvoiceSqft: item.gstInvoiceSqft,
          gstInvoiceRate: item.gstInvoiceRate,
        })),
        adjustment,
        gstPercentage,
        overallGstInvoiceSqft: data.gstInvoiceSqft,
        overallGstInvoiceRate: data.gstInvoiceRate,
      })

      if (gstCalculationMode === 'PRODUCT') {
        for (let index = 0; index < receiptItems.length; index++) {
          const itemBilling = billing.lines[index]
          await tx.purchaseReceiptItem.update({
            where: { id: receiptItems[index].id },
            data: itemBilling,
          })
          Object.assign(receiptItems[index], itemBilling)
        }
      }

      const billPayment = data.billPayment ?? billing.summary.gstInvoiceTotal ?? 0
      const cashPayment = data.cashPayment ?? billing.summary.cashPortion ?? 0

      await tx.purchaseReceipt.update({
        where: { id: receipt.id },
        data: {
          totalSqfts,
          totalSlabs,
          subtotal: receiptSubtotal,
          adjustment,
          gstCalculationMode,
          gstPercentage,
          netTotal: billing.summary.netTotal,
          gstInvoiceSqft: billing.summary.gstInvoiceSqft,
          gstInvoiceRate: billing.summary.gstInvoiceRate,
          gstInvoiceBaseValue: billing.summary.gstInvoiceBaseValue,
          gstInvoiceGst: billing.summary.gstInvoiceGst,
          gstInvoiceTotal: billing.summary.gstInvoiceTotal,
          cashPortion: billing.summary.cashPortion,
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
        include: {
          items: {
            where: { isActive: true },
            include: {
              receiptItems: {
                where: {
                  isActive: true,
                  purchaseReceipt: { isActive: true },
                },
                select: { receivedQty: true },
              },
            },
          },
        },
      })

      if (po) {
        const fullyReceived = po.items.length > 0 && po.items.every((orderItem) => (
          orderItem.orderedQty === null
          || orderItem.receiptItems.reduce((sum, item) => sum + Number(item.receivedQty), 0)
            >= Number(orderItem.orderedQty)
        ))

        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { status: fullyReceived ? 'COMPLETED' : 'PARTIAL_RECEIVED' },
        })
      }

      return {
        ...receipt,
        totalSqfts,
        totalSlabs,
        subtotal: receiptSubtotal,
        adjustment,
        ...billing.summary,
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
