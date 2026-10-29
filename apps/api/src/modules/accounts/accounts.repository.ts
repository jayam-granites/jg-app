import { prisma } from '#/lib/prisma'

export const accountsRepository = {
  findAll() {
    return prisma.account.findMany({
      where: { isActive: true },
      orderBy: [{ type: 'asc' }, { id: 'asc' }],
    })
  },

  findAllWithInactive() {
    return prisma.account.findMany({
      orderBy: [{ type: 'asc' }, { id: 'asc' }],
    })
  },

  findById(id: number) {
    return prisma.account.findUnique({
      where: { id },
    })
  },

  create(data: {
    name: string
    type: 'CASH' | 'UPI' | 'BANK_ACCOUNT'
    ownerTag?: string | null
    initialBalance?: number | string
    currentBalance?: number | string
    isActive?: boolean
  }) {
    return prisma.account.create({
      data,
    })
  },

  update(id: number, data: Record<string, unknown>) {
    return prisma.account.update({
      where: { id },
      data,
    })
  },

  delete(id: number) {
    return prisma.account.delete({
      where: { id },
    })
  },

  getTransactions(accountId: number) {
    return prisma.accountTransaction.findMany({
      where: { accountId },
      orderBy: [{ transactionDate: 'asc' }, { id: 'asc' }],
    })
  },
}
