import { prisma } from '#/lib/prisma'
import type { CreateProductDto, UpdateProductDto, Product } from '@jg-app/shared'

const productSelect = {
  id: true,
  name: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  description: true,
  hsnCode: true,
  lotNumber: true,
  widthReduction: true,
  isActive: true,
  variants: {
    include: {
      unit: { select: { id: true, code: true, name: true } },
      secondaryUnit: { select: { id: true, code: true, name: true } },
      attributes: {
        include: {
          attribute: { select: { id: true, code: true, name: true } },
          attributeValue: { select: { id: true, value: true } },
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
} as const

export const productRepository = {
  async findAll(): Promise<Product[]> {
    return prisma.product.findMany({
      select: productSelect,
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<Product[]>
  },

  async findById(id: number): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
      select: productSelect,
    }) as unknown as Promise<Product | null>
  },

  async createWithVariants(data: CreateProductDto): Promise<Product> {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description ?? null,
          hsnCode: data.hsnCode ?? null,
          lotNumber: data.lotNumber ?? null,
          widthReduction: data.widthReduction ?? null,
          variants: {
            create: data.variants.map((v) => ({
              skuCode: v.skuCode,
              unitId: v.unitId,
              secondaryUnitId: v.secondaryUnitId ?? null,
              mrp: 0,
              sellingPrice: 0,
              isActive: true,
              attributes: v.attributes?.length
                ? {
                    create: v.attributes.map((a) => ({
                      attributeId: a.attributeId,
                      attributeValueId: a.attributeValueId,
                    })),
                  }
                : undefined,
            })),
          },
        },
        select: productSelect,
      })
      return product as unknown as Product
    })
  },

  async updateWithVariants(id: number, data: UpdateProductDto): Promise<Product> {
    return prisma.$transaction(async (tx) => {
      const existingVariantIds = (
        await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        })
      ).map((v) => v.id)

      const incomingIds = data.variants.filter((v) => v.id).map((v) => v.id!) as number[]
      const toDelete = existingVariantIds.filter((vid) => !incomingIds.includes(vid))

      if (toDelete.length > 0) {
        await tx.productVariantAttribute.deleteMany({
          where: { productVariantId: { in: toDelete } },
        })
        await tx.productVariant.deleteMany({
          where: { id: { in: toDelete } },
        })
      }

      await tx.product.update({
        where: { id },
        data: {
          name: data.name,
          categoryId: data.categoryId,
          description: data.description ?? null,
          hsnCode: data.hsnCode ?? null,
          lotNumber: data.lotNumber ?? null,
          widthReduction: data.widthReduction ?? null,
        },
      })

      for (const v of data.variants) {
        if (v.id) {
          await tx.productVariantAttribute.deleteMany({
            where: { productVariantId: v.id },
          })
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              skuCode: v.skuCode,
              unitId: v.unitId,
              secondaryUnitId: v.secondaryUnitId ?? null,
              attributes: v.attributes?.length
                ? {
                    create: v.attributes.map((a) => ({
                      attributeId: a.attributeId,
                      attributeValueId: a.attributeValueId,
                    })),
                  }
                : undefined,
            },
          })
        } else {
          await tx.productVariant.create({
            data: {
              productId: id,
              skuCode: v.skuCode,
              unitId: v.unitId,
              secondaryUnitId: v.secondaryUnitId ?? null,
              mrp: 0,
              sellingPrice: 0,
              isActive: true,
              attributes: v.attributes?.length
                ? {
                    create: v.attributes.map((a) => ({
                      attributeId: a.attributeId,
                      attributeValueId: a.attributeValueId,
                    })),
                  }
                : undefined,
            },
          })
        }
      }

      return tx.product.findUnique({
        where: { id },
        select: productSelect,
      }) as unknown as Promise<Product>
    })
  },

  async delete(id: number): Promise<void> {
    await prisma.product.delete({ where: { id } })
  },
}
