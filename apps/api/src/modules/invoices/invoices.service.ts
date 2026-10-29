import { invoicesRepository } from './invoices.repository'
import { brokersRepository } from '../brokers/brokers.repository'
import { NotFoundError, ValidationError } from '#/lib/errors'
import { formatInvoiceNumber, invoiceNumberPrefix, sequenceFromInvoiceNumber } from './invoice-number'
import { roundInvoiceSqft } from '@jg-app/shared'

type InvoiceItemInput = {
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
  amount?: number
  remarks?: string
}

type TransportInput = {
  transportProviderId: number
  transportDate?: string
  vehicleNumber?: string
  fromLocation?: string
  toLocation?: string
  amount: number
  remarks?: string
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function itemAmount(item: InvoiceItemInput): number {
  if (typeof item.amount === 'number' && Number.isFinite(item.amount)) return item.amount
  return round2(item.qty * item.rate - (item.discountAmount ?? 0))
}

async function nextInvoiceNumber(invoiceDate: Date): Promise<string> {
  const prefix = invoiceNumberPrefix(invoiceDate)
  const latest = await invoicesRepository.findLatestInvoiceNumberByPrefix(prefix)
  const lastSequence = latest ? sequenceFromInvoiceNumber(latest.invoiceNumber, prefix) : 0
  return formatInvoiceNumber(invoiceDate, lastSequence + 1)
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'P2002'
  )
}

function calculateTotals(data: {
  items: InvoiceItemInput[]
  isGst?: boolean
  isHalfGst?: boolean
  gstPercent?: number
  loadingRate?: number
  loadingAmount?: number
  transport?: TransportInput
  receivedAmount?: number
}) {
  const subtotal = round2(data.items.reduce((sum, item) => sum + itemAmount(item), 0))

  const loadingSqft = data.items
    .filter((item) => item.isLoadingApplicable !== false)
    .reduce((sum, item) => sum + item.qty, 0)
  const loadingAmount = round2(data.loadingAmount ?? (data.loadingRate ?? 0) * loadingSqft)

  const transportAmount = round2(data.transport?.amount ?? 0)
  const totalBeforeTax = round2(subtotal + loadingAmount + transportAmount)

  const gstPercent = data.isGst ? (data.gstPercent ?? 18) : 0
  const taxableAmount = data.isGst
    ? round2(data.isHalfGst ? totalBeforeTax / 2 : totalBeforeTax)
    : 0
  const cgstAmount = round2((taxableAmount * gstPercent) / 200)
  const sgstAmount = round2((taxableAmount * gstPercent) / 200)
  const totalTaxAmount = round2(cgstAmount + sgstAmount)
  const totalBeforeRound = round2(totalBeforeTax + totalTaxAmount)
  const roundOffAmount = round2(Math.ceil(totalBeforeRound) - totalBeforeRound)
  const grandTotal = round2(totalBeforeRound + roundOffAmount)

  const receivedAmount = round2(data.receivedAmount ?? 0)
  const balanceAmount = round2(grandTotal - receivedAmount)
  const status = receivedAmount <= 0 ? 'PENDING' : balanceAmount <= 0.01 ? 'PAID' : 'PARTIAL_PAID'

  return {
    subtotal,
    loadingAmount,
    transportAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    totalTaxAmount,
    roundOffAmount,
    grandTotal,
    receivedAmount,
    balanceAmount,
    status,
  }
}

export const invoicesService = {
  async getAll() {
    return invoicesRepository.findAll()
  },

  async getById(id: number) {
    const invoice = await invoicesRepository.findById(id)
    if (!invoice) throw new NotFoundError('Invoice')
    return invoice
  },

  async create(data: {
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
    paymentMethod?: string
    discountAmount?: number
    remarks?: string
    transport?: TransportInput
    items: InvoiceItemInput[]
  }) {
    if (!data.items || data.items.length === 0) {
      throw new ValidationError('At least one item is required')
    }

    const items = data.items.map((item) => {
      const qty = roundInvoiceSqft(item.qty)
      return {
        ...item,
        qty,
        amount: round2(qty * item.rate - (item.discountAmount ?? 0)),
      }
    })
    const totals = calculateTotals({ ...data, items })
    const now = new Date()
    const invoiceDate = data.invoiceDate ? new Date(data.invoiceDate) : now

    const invoiceData = {
      customerId: data.customerId,
      invoiceDate,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      isGst: data.isGst,
      isHalfGst: data.isHalfGst,
      isTaxInclusive: data.isTaxInclusive,
      gstPercent: data.isGst ? (data.gstPercent ?? 18) : undefined,
      loadingRate: data.loadingRate,
      loadingAmount: totals.loadingAmount,
      receivedAmount: totals.receivedAmount,
      balanceAmount: totals.balanceAmount,
      paymentMethod: data.paymentMethod,
      accountId: (data as any).accountId,
      status: totals.status,
      discountAmount: data.discountAmount,
      subtotal: totals.subtotal,
      taxableAmount: totals.taxableAmount,
      cgstAmount: totals.cgstAmount,
      sgstAmount: totals.sgstAmount,
      igstAmount: 0,
      totalTaxAmount: totals.totalTaxAmount,
      roundOffAmount: totals.roundOffAmount,
      grandTotal: totals.grandTotal,
      remarks: data.remarks,
      transport: data.transport
        ? {
            transportProviderId: data.transport.transportProviderId,
            transportDate: data.transport.transportDate
              ? new Date(data.transport.transportDate)
              : now,
            vehicleNumber: data.transport.vehicleNumber,
            fromLocation: data.transport.fromLocation,
            toLocation: data.transport.toLocation,
            amount: data.transport.amount,
            remarks: data.transport.remarks,
          }
        : undefined,
      items: items.map((item) => ({
        ...item,
        itemType: item.itemType ?? 'PRODUCT',
        amount: itemAmount(item),
      })),
    }

    let lastError: unknown
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invoiceNumber = await nextInvoiceNumber(invoiceDate)
      try {
        const invoice = await invoicesRepository.createWithItems({ ...invoiceData, invoiceNumber })
        if (totals.receivedAmount > 0) {
          await invoicesRepository.createPayment({
            invoiceId: invoice.id,
            amount: totals.receivedAmount,
            paymentMethod: data.paymentMethod,
            accountId: (data as any).accountId ?? null,
            paymentDate: invoiceDate,
            remarks: 'Initial payment',
          })
        }
        if ((data as any).accountId && totals.receivedAmount > 0) {
          try {
            const { accountsService } = await import('../accounts/accounts.service')
            await accountsService.applyInvoicePayment((data as any).accountId, invoice.id, totals.receivedAmount)
          } catch (err) {
            // ignore
          }
        }
        return await this.getById(invoice.id)
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error
        lastError = error
      }
    }

    throw lastError
  },

  async update(
    id: number,
    data: {
      status?: string
      dueDate?: string
      isGst?: boolean
      isHalfGst?: boolean
      isTaxInclusive?: boolean
      gstPercent?: number
      loadingRate?: number
      loadingAmount?: number
      receivedAmount?: number
      paymentMethod?: string
      accountId?: number
      subtotal?: number
      discountAmount?: number
      taxableAmount?: number
      cgstAmount?: number
      sgstAmount?: number
      igstAmount?: number
      totalTaxAmount?: number
      roundOffAmount?: number
      grandTotal?: number
      remarks?: string
    },
  ) {
    const invoice = await this.getById(id)
    const dbData: Record<string, unknown> = { ...data }
    if (data.dueDate) dbData.dueDate = new Date(data.dueDate)

    if (data.receivedAmount !== undefined) {
      const grandTotal = round2(Number(data.grandTotal ?? invoice.grandTotal ?? 0))
      const receivedAmount = round2(data.receivedAmount)
      const prevReceived = round2(Number(invoice.receivedAmount ?? 0))
      const balanceAmount = round2(grandTotal - receivedAmount)
      dbData.receivedAmount = receivedAmount
      dbData.balanceAmount = balanceAmount
      dbData.status =
        receivedAmount <= 0 ? 'PENDING' : balanceAmount <= 0.01 ? 'PAID' : 'PARTIAL_PAID'

      if ((data as any).accountId || invoice.accountId) {
        const diff = round2(receivedAmount - prevReceived)
        if (diff > 0) {
          try {
            const { accountsService } = await import('../accounts/accounts.service')
            await accountsService.applyInvoicePayment((data as any).accountId || invoice.accountId, id, diff)
          } catch (err) {
            // ignore
          }
        }
      }
    } else if ((data as any).accountId !== undefined) {
      dbData.accountId = (data as any).accountId
    }

    return invoicesRepository.update(id, dbData)
  },

  async recordPayment(
    invoiceId: number,
    data: {
      amount: number
      paymentMethod?: string
      accountId?: number
      paymentDate?: string
      remarks?: string
    },
  ) {
    const invoice = await this.getById(invoiceId)
    const amount = round2(Number(data.amount))
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ValidationError('Payment amount must be greater than 0')
    }

    const grandTotal = round2(Number(invoice.grandTotal ?? 0))
    const received = round2(Number(invoice.receivedAmount ?? 0))
    const balance = round2(Number(invoice.balanceAmount ?? grandTotal - received))
    if (amount > balance + 0.01) {
      throw new ValidationError(`Payment cannot exceed the outstanding balance of ₹${balance.toFixed(2)}`)
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date()
    const accountId = data.accountId ?? invoice.accountId ?? null

    if (invoice.payments.length === 0 && received > 0) {
      await invoicesRepository.createPayment({
        invoiceId,
        amount: received,
        paymentMethod: invoice.paymentMethod ?? undefined,
        accountId: invoice.accountId ?? null,
        paymentDate: invoice.invoiceDate,
        remarks: 'Opening payment',
      })
    }

    await invoicesRepository.createPayment({
      invoiceId,
      amount,
      paymentMethod: data.paymentMethod,
      accountId,
      paymentDate,
      remarks: data.remarks,
    })

    await this.recalculateFinancials(invoiceId)

    if (accountId) {
      try {
        const { accountsService } = await import('../accounts/accounts.service')
        await accountsService.applyInvoicePayment(accountId, invoiceId, amount)
      } catch (err) {
        // ignore
      }
    }

    return await this.getById(invoiceId)
  },

  async deletePayment(invoiceId: number, paymentId: number) {
    const invoice = await this.getById(invoiceId)
    const payment = invoice.payments.find((item) => item.id === paymentId)
    if (!payment) throw new NotFoundError('Invoice payment')

    await invoicesRepository.deletePayment(invoiceId, paymentId)
    const updated = await this.recalculateFinancials(invoiceId)

    if (payment.accountId != null) {
      try {
        const { accountsService } = await import('../accounts/accounts.service')
        await accountsService.revertInvoicePayment(payment.accountId, invoiceId, Number(payment.amount))
      } catch (err) {
        // ignore
      }
    }

    return updated
  },

  async recalculateFinancials(invoiceId: number) {
    const invoice = await invoicesRepository.findById(invoiceId)
    if (!invoice) throw new NotFoundError('Invoice')

    const receivedAmount = round2(
      invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    )
    const grandTotal = round2(Number(invoice.grandTotal ?? 0))
    const balanceAmount = round2(grandTotal - receivedAmount)
    const status =
      receivedAmount <= 0 ? 'PENDING' : balanceAmount <= 0.01 ? 'PAID' : 'PARTIAL_PAID'
    const latestPayment = invoice.payments[invoice.payments.length - 1]

    return invoicesRepository.update(invoiceId, {
      receivedAmount,
      balanceAmount,
      status,
      ...(latestPayment?.paymentMethod ? { paymentMethod: latestPayment.paymentMethod } : {}),
      ...(latestPayment?.accountId != null ? { accountId: latestPayment.accountId } : {}),
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
    await this.getById(invoiceId)
    const broker = await brokersRepository.findById(data.brokerId)
    if (!broker) throw new ValidationError('Broker not found')
    if (!Number.isFinite(data.commissionAmount) || data.commissionAmount < 0) {
      throw new ValidationError('Commission amount must be a valid positive number')
    }

    return invoicesRepository.createCommission(invoiceId, {
      ...data,
      commissionAmount: round2(data.commissionAmount),
      commissionPercent:
        data.commissionPercent !== undefined ? round2(data.commissionPercent) : undefined,
    })
  },

  async deleteCommission(invoiceId: number, commissionId: number) {
    await this.getById(invoiceId)
    const result = await invoicesRepository.deleteCommission(invoiceId, commissionId)
    if (result.count === 0) throw new NotFoundError('Invoice commission')
    return { success: true }
  },

  async delete(id: number) {
    await this.getById(id)
    await invoicesRepository.delete(id)
  },
}
