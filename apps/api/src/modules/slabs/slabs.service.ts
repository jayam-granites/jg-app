import { slabsRepository } from './slabs.repository'
import { ValidationError } from '#/lib/errors'

export const slabsService = {
  async getAll() {
    return slabsRepository.findAll()
  },

  async getByProduct(productId: number) {
    return slabsRepository.findByProductId(productId)
  },

  async getByMeasurement(measurementId: number) {
    return slabsRepository.findByMeasurementId(measurementId)
  },

  async create(data: {
    productId: number
    slabNumber: number
    width: number
    height: number
    area: number
    measurementId?: number
  }) {
    if (!data.productId || data.productId <= 0) {
      throw new ValidationError('Product is required')
    }
    if (!data.slabNumber || data.slabNumber <= 0) {
      throw new ValidationError('Slab number is required')
    }
    if (!data.width || data.width <= 0) {
      throw new ValidationError('Width is required')
    }
    if (!data.height || data.height <= 0) {
      throw new ValidationError('Height is required')
    }
    return slabsRepository.create(data)
  },

  async update(
    id: number,
    data: {
      slabNumber?: number
      width?: number
      height?: number
      area?: number
      isActive?: boolean
    },
  ) {
    return slabsRepository.update(id, data)
  },

  async delete(id: number) {
    return slabsRepository.delete(id)
  },
}
