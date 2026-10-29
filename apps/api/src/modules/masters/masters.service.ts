import { mastersRepository } from './masters.repository'
import type { CategoryType } from '@prisma/client'
import { ConflictError, ValidationError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'

export const mastersService = {
  async getLookupOptions(group?: string) {
    const rows = await mastersRepository.findLookupOptions(group)
    const grouped: Record<string, unknown[]> = {}
    for (const row of rows) {
      ;(grouped[row.group] ??= []).push(row)
    }
    return grouped
  },

  async getSettings() {
    return mastersRepository.findSettings()
  },

  async getCategories(type?: CategoryType) {
    return mastersRepository.findCategories(type)
  },

  async getUnits() {
    return mastersRepository.findUnits()
  },

  async getAttributes() {
    return mastersRepository.findAttributes()
  },

  async getAttributeValues(attributeId?: number) {
    return mastersRepository.findAttributeValues(attributeId)
  },

  async createCategory(data: { name: string; type: CategoryType; parentId?: number | null; isActive?: boolean }) {
    if (data.parentId) {
      const parentExists = await prisma.category.findFirst({
        where: { id: data.parentId, isActive: true },
      })
      if (!parentExists) {
        throw new ValidationError('Parent category does not exist or is inactive')
      }
    }

    const existing = await mastersRepository.findCategoryByNameAndParent(data.name, data.parentId)
    if (existing) {
      throw new ConflictError('A category with this name already exists under the selected parent category')
    }

    return mastersRepository.createCategory(data)
  },

  async updateCategory(id: number, data: { name?: string; type?: CategoryType; parentId?: number | null; isActive?: boolean }) {
    const existing = await mastersRepository.findCategoryById(id)
    if (!existing) throw new ValidationError('Category not found')

    if (data.name && data.name !== existing.name) {
      const conflict = await mastersRepository.findCategoryByNameAndParent(data.name, data.parentId ?? existing.parentId)
      if (conflict && conflict.id !== id) {
        throw new ConflictError('A category with this name already exists under the selected parent category')
      }
    }

    return mastersRepository.updateCategory(id, data)
  },

  async updateUnit(id: number, data: { code?: string; name?: string; isActive?: boolean }) {
    const existing = await mastersRepository.findUnitById(id)
    if (!existing) throw new ValidationError('Unit not found')

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const conflict = await mastersRepository.findUnitByCode(data.code)
      if (conflict && conflict.id !== id) {
        throw new ConflictError(`A unit with code '${data.code.toUpperCase()}' already exists`)
      }
    }

    if (data.name && data.name.toLowerCase() !== existing.name.toLowerCase()) {
      const conflict = await mastersRepository.findUnitByName(data.name)
      if (conflict && conflict.id !== id) {
        throw new ConflictError(`A unit with name '${data.name}' already exists`)
      }
    }

    return mastersRepository.updateUnit(id, data)
  },

  async updateAttribute(id: number, data: { code?: string; name?: string; values?: string[]; isActive?: boolean }) {
    const existing = await mastersRepository.findAttributeById(id)
    if (!existing) throw new ValidationError('Attribute not found')

    if (data.code && data.code.toUpperCase() !== existing.code) {
      const conflict = await mastersRepository.findAttributeByCode(data.code)
      if (conflict && conflict.id !== id) {
        throw new ConflictError(`An attribute with code '${data.code.toUpperCase()}' already exists`)
      }
    }

    return mastersRepository.updateAttribute(id, data)
  },

  async createAttribute(data: { code: string; name: string; values?: string[]; isActive?: boolean }) {
    const existing = await mastersRepository.findAttributeByCode(data.code)
    if (existing) {
      throw new ConflictError(`An attribute with code '${data.code.toUpperCase()}' already exists`)
    }
    return mastersRepository.createAttribute(data)
  },

  async getCategoryAttributes(categoryId: number) {
    const links = await mastersRepository.findCategoryAttributes(categoryId)
    return links.map((l) => ({
      id: l.attribute.id,
      code: l.attribute.code,
      name: l.attribute.name,
      isActive: l.attribute.isActive,
      isRequired: l.isRequired,
    }))
  },

  async linkCategoryAttributes(
    categoryId: number,
    attributes: { attributeId: number; isRequired: boolean }[],
  ) {
    await mastersRepository.replaceCategoryAttributes(categoryId, attributes)
    return this.getCategoryAttributes(categoryId)
  },

  async createUnit(data: { code: string; name: string; isActive?: boolean }) {
    const existingCode = await mastersRepository.findUnitByCode(data.code)
    if (existingCode) {
      throw new ConflictError(`A unit with code '${data.code.toUpperCase()}' already exists`)
    }

    const existingName = await mastersRepository.findUnitByName(data.name)
    if (existingName) {
      throw new ConflictError(`A unit with name '${data.name}' already exists`)
    }

    return mastersRepository.createUnit(data)
  },
}
