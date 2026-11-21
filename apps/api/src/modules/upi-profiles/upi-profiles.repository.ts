import { Prisma } from '@prisma/client'
import { prisma } from '#/lib/prisma'
import { ConflictError, NotFoundError } from '#/lib/errors'

type UpiProfileData = {
  payeeVPA?: string
  payeeName?: string
  isDefault?: boolean
}

async function lockDefaultProfile(transaction: Prisma.TransactionClient) {
  // Serialize default changes; the partial unique index is the final integrity guard.
  // Advisory locks return void, so $executeRaw is required (not $queryRaw).
  await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('upi_profile_default'))`
}

function throwOnDefaultConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictError('Another default UPI profile was set concurrently. Please retry.')
  }
  throw error
}

export const upiProfilesRepository = {
  findAll() {
    return prisma.upiProfile.findMany({
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    })
  },

  create(data: { payeeVPA: string; payeeName: string; isDefault: boolean }) {
    if (!data.isDefault) {
      return prisma.upiProfile.create({ data })
    }

    return prisma.$transaction(async (transaction) => {
      try {
        await lockDefaultProfile(transaction)
        await transaction.upiProfile.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        })
        return await transaction.upiProfile.create({ data })
      } catch (error) {
        throwOnDefaultConflict(error)
      }
    })
  },

  update(id: number, data: UpiProfileData) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.upiProfile.findUnique({ where: { id } })
      if (!current) throw new NotFoundError('UPI profile')

      try {
        if (data.isDefault === true) {
          await lockDefaultProfile(transaction)
          await transaction.upiProfile.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false },
          })
        }
        return await transaction.upiProfile.update({ where: { id }, data })
      } catch (error) {
        throwOnDefaultConflict(error)
      }
    })
  },

  delete(id: number) {
    return prisma.$transaction(async (transaction) => {
      await lockDefaultProfile(transaction)
      const current = await transaction.upiProfile.findUnique({ where: { id } })
      if (!current) throw new NotFoundError('UPI profile')

      const deleted = await transaction.upiProfile.delete({ where: { id } })
      if (current.isDefault) {
        const nextDefault = await transaction.upiProfile.findFirst({
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
        if (nextDefault) {
          await transaction.upiProfile.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          })
        }
      }
      return deleted
    })
  },
}
