import { prisma } from '#/lib/prisma'

export const suppliersRepository = {
  async findAll() {
    return prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    })
  },

  async findById(id: number) {
    return prisma.supplier.findUnique({ where: { id } })
  },

  async findByAccountNumber(accountNumber: string) {
    return prisma.supplier.findFirst({
      where: { accountNumber },
    })
  },

  async create(data: {
    name: string
    mobile?: string
    address?: string
    gstNumber?: string
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    branchName?: string
    upiId?: string
    isActive?: boolean
  }) {
    return prisma.supplier.create({ data })
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      address?: string
      gstNumber?: string
      bankName?: string
      accountNumber?: string
      ifscCode?: string
      branchName?: string
      upiId?: string
      isActive?: boolean
    },
  ) {
    return prisma.supplier.update({ where: { id }, data })
  },
}
