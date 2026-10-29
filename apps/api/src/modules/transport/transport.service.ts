import { transportRepository } from './transport.repository'
import { ValidationError } from '#/lib/errors'

export const transportService = {
  async getAll() {
    return transportRepository.findAll()
  },

  async getById(id: number) {
    const provider = await transportRepository.findById(id)
    if (!provider) throw new ValidationError('Transport provider not found')
    return provider
  },

  async create(data: {
    name: string
    mobile?: string
    vehicleNumber?: string
    address?: string
    isActive?: boolean
  }) {
    return transportRepository.create(data)
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      vehicleNumber?: string
      address?: string
      isActive?: boolean
    },
  ) {
    const existing = await transportRepository.findById(id)
    if (!existing) throw new ValidationError('Transport provider not found')
    return transportRepository.update(id, data)
  },
}
