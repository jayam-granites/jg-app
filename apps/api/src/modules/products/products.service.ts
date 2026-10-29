import { productRepository } from './products.repository'
import { NotFoundError } from '#/lib/errors'
import type { CreateProductDto, UpdateProductDto } from '@jg-app/shared'
import type { Product } from '@jg-app/shared'

export const productService = {
  async getAll(): Promise<Product[]> {
    return productRepository.findAll()
  },

  async getById(id: number): Promise<Product> {
    const product = await productRepository.findById(id)
    if (!product) throw new NotFoundError('Product')
    return product
  },

  async create(data: CreateProductDto): Promise<Product> {
    return productRepository.createWithVariants(data)
  },

  async update(id: number, data: UpdateProductDto): Promise<Product> {
    await this.getById(id)
    return productRepository.updateWithVariants(id, data)
  },

  async delete(id: number): Promise<void> {
    await this.getById(id)
    await productRepository.delete(id)
  },
}
