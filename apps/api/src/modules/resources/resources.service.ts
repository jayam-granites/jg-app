import { capitalizeName } from '@jg-app/shared'
import { NotFoundError } from '#/lib/errors'
import {
  resourcesRepository,
  type CreateResourceData,
  type ResourceFilters,
  type UpdateResourceData,
} from './resources.repository'

export const resourcesService = {
  getAll(filters: ResourceFilters = {}) {
    return resourcesRepository.findAll(filters)
  },

  async getById(id: number) {
    const resource = await resourcesRepository.findById(id)
    if (!resource) throw new NotFoundError('Resource contact')
    return resource
  },

  create(data: CreateResourceData) {
    return resourcesRepository.create({
      ...data,
      name: capitalizeName(data.name),
    })
  },

  async update(id: number, data: UpdateResourceData) {
    await this.getById(id)
    return resourcesRepository.update(id, {
      ...data,
      ...(data.name !== undefined ? { name: capitalizeName(data.name) } : {}),
    })
  },

  async archive(id: number) {
    await this.update(id, { isActive: false })
  },
}
