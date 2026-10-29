import { prisma } from '#/lib/prisma'

const invoiceInclude = {
  customer: { select: { id: true, name: true, mobile: true, address: true, gstNumber: true } },
  items: {
    where: { isActive: true },
    include: {
      unit: { select: { id: true, code: true, name: true } },
      secondaryUnit: { select: { id: true, code: true, name: true } },
      productVariant: {
        select: {
          product: { select: { id: true, name: true, hsnCode: true } },
        },
      },
    },
  },
  invoiceTransports: {
    where: { isActive: true },
    include: { transportProvider: { select: { id: true, name: true, mobile: true, vehicleNumber: true } } },
  },
  commissions: {
    where: { isActive: true },
    include: { broker: { select: { id: true, name: true, mobile: true } } },
    orderBy: { createdAt: 'asc' },
  },
  payments: {
    where: { isActive: true },
    include: { account: { select: { id: true, name: true, type: true } } },
    orderBy: { paymentDate: 'asc' },
  },
} as const

export const invoicesRepository = {
  async findAll() {
    return prisma.invoice.findMany({
      include: invoiceInclude,
      orderBy: { createdAt: 'desc' },
    })
  },

  async findById(id: number) {
    return prisma.invoice.findUnique({ where: { id }, include: invoiceInclude })
  },



  async findLatestInvoiceNumberByPrefix(prefix: string) {
    return prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    })
  },

  async createWithItems(data: {
    invoiceNumber: string
    customerId: number
    invoiceDate: Date
    dueDate?: Date
    isGst?: boolean
    isHalfGst?: boolean
    isTaxInclusive?: boolean
    gstPercent?: number
    loadingRate?: number
    loadingAmount?: number
    receivedAmount?: number
    balanceAmount?: number
    paymentMethod?: string
    accountId?: number | null
    status?: string
    transport?: {
      transportProviderId: number
      transportDate?: Date
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
    items: {
      itemType?: string
      productVariantId?: number
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
    }[]
  }) {
    return prisma.invoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate ?? null,
        isGst: data.isGst ?? false,
        isHalfGst: data.isHalfGst ?? false,
        isTaxInclusive: data.isTaxInclusive ?? false,
        gstPercent: data.gstPercent ?? null,
        loadingRate: data.loadingRate ?? null,
        loadingAmount: data.loadingAmount ?? null,
        receivedAmount: data.receivedAmount ?? 0,
        balanceAmount: data.balanceAmount ?? null,
        paymentMethod: data.paymentMethod ?? null,
        accountId: (data as any).accountId ?? null,
        status: (data.status ?? 'PENDING') as any,
        discountAmount: data.discountAmount ?? null,
        subtotal: data.subtotal ?? null,
        taxableAmount: data.taxableAmount ?? null,
        cgstAmount: data.cgstAmount ?? null,
        sgstAmount: data.sgstAmount ?? null,
        igstAmount: data.igstAmount ?? null,
        totalTaxAmount: data.totalTaxAmount ?? null,
        roundOffAmount: data.roundOffAmount ?? null,
        grandTotal: data.grandTotal ?? null,
        remarks: data.remarks ?? null,
        items: {
          create: data.items.map((item) => ({
            itemType: (item.itemType ?? 'PRODUCT') as any,
            productVariantId: item.productVariantId ?? null,
            description: item.description ?? null,
            unitId: item.unitId ?? null,
            secondaryUnitId: item.secondaryUnitId ?? null,
            qty: item.qty,
            slabCount: item.slabCount ?? null,
            isLoadingApplicable: item.isLoadingApplicable ?? true,
            rate: item.rate,
            discountAmount: item.discountAmount ?? null,
            taxPercent: item.taxPercent ?? null,
            taxAmount: item.taxAmount ?? null,
            amount: item.amount,
            remarks: item.remarks ?? null,
          })) as any,
        },
        ...(data.transport
          ? {
              invoiceTransports: {
                create: {
                  transportProviderId: data.transport.transportProviderId,
                  transportDate: data.transport.transportDate ?? new Date(),
                  vehicleNumber: data.transport.vehicleNumber ?? null,
                  fromLocation: data.transport.fromLocation ?? null,
                  toLocation: data.transport.toLocation ?? null,
                  amount: data.transport.amount,
                  remarks: data.transport.remarks ?? null,
                },
              },
            }
          : {}),
      },
      include: invoiceInclude,
    })
  },

  async update(id: number, data: Record<string, unknown>) {
    return prisma.invoice.update({
      where: { id },
      data: data as any,
      include: invoiceInclude,
    })
  },

  async findPayments(invoiceId: number) {
    return prisma.invoicePayment.findMany({
      where: { invoiceId, isActive: true },
      include: { account: { select: { id: true, name: true, type: true } } },
      orderBy: [{ paymentDate: 'asc' }, { id: 'asc' }],
    })
  },

  async createPayment(data: {
    invoiceId: number
    amount: number
    paymentMethod?: string
    accountId?: number | null
    paymentDate?: Date
    remarks?: string
  }) {
    return prisma.invoicePayment.create({
      data: {
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod ?? null,
        accountId: data.accountId ?? null,
        paymentDate: data.paymentDate ?? new Date(),
        remarks: data.remarks ?? null,
      },
      include: { account: { select: { id: true, name: true, type: true } } },
    })
  },

  async deletePayment(invoiceId: number, paymentId: number) {
    return prisma.invoicePayment.updateMany({
      where: { id: paymentId, invoiceId, isActive: true },
      data: { isActive: false },
    })
  },

  async createCommission(
    invoiceId: number,
    data: {
      brokerId: number
      commissionPercent?: number
      commissionAmount: number
      remarks?: string
    },
  ) {
    return prisma.invoiceCommission.create({
      data: {
        invoiceId,
        brokerId: data.brokerId,
        commissionPercent: data.commissionPercent,
        commissionAmount: data.commissionAmount,
        remarks: data.remarks,
      },
      include: { broker: { select: { id: true, name: true, mobile: true } } },
    })
  },

  async deleteCommission(invoiceId: number, commissionId: number) {
    return prisma.invoiceCommission.updateMany({
      where: { id: commissionId, invoiceId },
      data: { isActive: false },
    })
  },

  async delete(id: number) {
    return prisma.invoice.delete({ where: { id } })
  },
}
