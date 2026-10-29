import { suppliersRepository } from './suppliers.repository'
import { ValidationError, ConflictError } from '#/lib/errors'

export const suppliersService = {
  async getAll() {
    return suppliersRepository.findAll()
  },

  async getById(id: number) {
    const supplier = await suppliersRepository.findById(id)
    if (!supplier) throw new ValidationError('Supplier not found')
    return supplier
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
    if (data.accountNumber) {
      const existing = await suppliersRepository.findByAccountNumber(data.accountNumber)
      if (existing) {
        throw new ConflictError('A supplier with this account number already exists')
      }
    }

    return suppliersRepository.create(data)
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
    const existing = await suppliersRepository.findById(id)
    if (!existing) throw new ValidationError('Supplier not found')

    if (data.accountNumber && data.accountNumber !== existing.accountNumber) {
      const conflict = await suppliersRepository.findByAccountNumber(data.accountNumber)
      if (conflict && conflict.id !== id) {
        throw new ConflictError('A supplier with this account number already exists')
      }
    }

    return suppliersRepository.update(id, data)
  },
}
