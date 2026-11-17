import type {
  CreateResourceContactFormData,
  UpdateResourceContactFormData,
} from '@jg-app/validators'
import { NotFoundError } from '#/lib/errors'
import { resourcesRepository } from './resources.repository'

export const resourcesService = {
  getAll() {
    return resourcesRepository.findAll()
  },

  async getById(id: number) {
    const resource = await resourcesRepository.findById(id)
    if (!resource) throw new NotFoundError('Resource contact')
    return resource
  },

  create(data: CreateResourceContactFormData) {
    return resourcesRepository.create(data)
  },

  async update(id: number, data: UpdateResourceContactFormData) {
    await this.getById(id)
    return resourcesRepository.update(id, data)
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
