import { prisma } from '#/lib/prisma'
import type { CategoryType } from '@prisma/client'

export const mastersRepository = {
  async findLookupOptions(group?: string) {
    return prisma.lookupOption.findMany({
      where: {
        isActive: true,
        ...(group ? { group } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    })
  },

  async findSettings() {
    const rows = await prisma.setting.findMany()
    return Object.fromEntries(rows.map((r) => [r.key, r.value]))
  },

  async findCategories(type?: CategoryType) {
    const where = type ? { type } : {}
    return prisma.category.findMany({
      where,
      select: {
        id: true,
        name: true,
        parentId: true,
        type: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  },

  async findUnits() {
    return prisma.unit.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  },

  async findAttributes() {
    return prisma.attribute.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        _count: {
          select: { values: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })
  },

  async findAttributeValues(attributeId?: number) {
    const where = attributeId ? { attributeId, isActive: true } : { isActive: true }
    return prisma.attributeValue.findMany({
      where,
      select: {
        id: true,
        value: true,
        attributeId: true,
      },
      orderBy: {
        value: 'asc',
      },
    })
  },

  async findCategoryByNameAndParent(name: string, parentId?: number | null) {
    return prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        parentId: parentId || null,
      },
    })
  },

  async findUnitByCode(code: string) {
    return prisma.unit.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
      },
    })
  },

  async findUnitByName(name: string) {
    return prisma.unit.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
      },
    })
  },

  async createCategory(data: { name: string; type: CategoryType; parentId?: number | null; isActive?: boolean }) {
    return prisma.category.create({
      data: {
        name: data.name,
        type: data.type,
        parentId: data.parentId || null,
        isActive: data.isActive ?? true,
      },
    })
  },

  async findAttributeByCode(code: string) {
    return prisma.attribute.findFirst({
      where: { code: { equals: code, mode: 'insensitive' } },
    })
  },

  async findCategoryById(id: number) {
    return prisma.category.findUnique({ where: { id } })
  },

  async updateCategory(id: number, data: { name?: string; type?: CategoryType; parentId?: number | null; isActive?: boolean }) {
    return prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  },

  async findUnitById(id: number) {
    return prisma.unit.findUnique({ where: { id } })
  },

  async updateUnit(id: number, data: { code?: string; name?: string; isActive?: boolean }) {
    return prisma.unit.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code.toUpperCase() }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })
  },

  async findAttributeById(id: number) {
    return prisma.attribute.findUnique({ where: { id }, include: { _count: { select: { values: true } } } })
  },

  async updateAttribute(id: number, data: { code?: string; name?: string; values?: string[]; isActive?: boolean }) {
    const updateData: Record<string, unknown> = {
      ...(data.code !== undefined && { code: data.code.toUpperCase() }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    }

    if (data.values !== undefined) {
      updateData.values = {
        deleteMany: {},
        createMany: {
          data: data.values.filter(Boolean).map((v) => ({ value: v, isActive: true })),
        },
      }
    }

    return prisma.attribute.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { values: true } } },
    })
  },

  async createAttribute(data: { code: string; name: string; values?: string[]; isActive?: boolean }) {
    return prisma.attribute.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        isActive: data.isActive ?? true,
        values: data.values?.length
          ? {
              createMany: {
                data: data.values.map((v) => ({ value: v, isActive: true })),
              },
            }
          : undefined,
      },
      include: {
        _count: { select: { values: true } },
      },
    })
  },

  async findCategoryAttributes(categoryId: number) {
    return prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    })
  },

  async replaceCategoryAttributes(
    categoryId: number,
    attributes: { attributeId: number; isRequired: boolean }[],
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.categoryAttribute.deleteMany({ where: { categoryId } })
      if (attributes.length > 0) {
        await tx.categoryAttribute.createMany({
          data: attributes.map((a) => ({
            categoryId,
            attributeId: a.attributeId,
            isRequired: a.isRequired,
          })),
        })
      }
    })
  },

  async createUnit(data: { code: string; name: string; isActive?: boolean }) {
    return prisma.unit.create({
      data: {
        code: data.code.toUpperCase(),
        name: data.name,
        isActive: data.isActive ?? true,
      },
    })
  },
}
