import { customersRepository } from './customers.repository'
import { NotFoundError } from '#/lib/errors'

export const customersService = {
  async getAll() {
    return customersRepository.findAll()
  },

  async getById(id: number) {
    const customer = await customersRepository.findById(id)
    if (!customer) throw new NotFoundError('Customer')
    return customer
  },

  async create(data: {
    name: string
    mobile?: string
    alternateMobile?: string
    address?: string
    city?: string
    state?: string
    pincode?: string
    gstNumber?: string
  }) {
    return customersRepository.create(data)
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      alternateMobile?: string
      address?: string
      city?: string
      state?: string
      pincode?: string
      gstNumber?: string
      isActive?: boolean
    },
  ) {
    await this.getById(id)
    return customersRepository.update(id, data)
  },

  async delete(id: number) {
    await this.getById(id)
    await customersRepository.delete(id)
  },
}
