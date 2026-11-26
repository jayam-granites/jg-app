import { capitalizeName } from '@jg-app/shared'
import { brokersRepository } from './brokers.repository'
import { ValidationError } from '#/lib/errors'

export const brokersService = {
  async getAll() {
    return brokersRepository.findAll()
  },

  async getById(id: number) {
    const broker = await brokersRepository.findById(id)
    if (!broker) throw new ValidationError('Broker not found')
    return broker
  },

  async create(data: {
    name: string
    mobile?: string
    address?: string
    commissionPercent?: number
    isActive?: boolean
  }) {
    return brokersRepository.create({
      ...data,
      name: capitalizeName(data.name),
    })
  },

  async update(
    id: number,
    data: {
      name?: string
      mobile?: string
      address?: string
      commissionPercent?: number
      isActive?: boolean
    },
  ) {
    const existing = await brokersRepository.findById(id)
    if (!existing) throw new ValidationError('Broker not found')
    return brokersRepository.update(id, {
      ...data,
      ...(data.name !== undefined ? { name: capitalizeName(data.name) } : {}),
    })
  },
}
