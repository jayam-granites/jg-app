import { userRepository } from './users.repository'
import { NotFoundError, ConflictError, ForbiddenError } from '#/lib/errors'
import { prisma } from '#/lib/prisma'
import { hasMinimumRole, isAppRole, type AppRole, type User, type UserDto } from '@jg-app/shared'
import type { Prisma } from '@prisma/client'
import { auth } from '#/lib/auth'

type UserManager = { id: string; role: AppRole }

async function findManagedUser(tx: Prisma.TransactionClient, id: string, caller: UserManager) {
  if (id === caller.id) throw new ForbiddenError('You cannot manage your own account')

  const user = await tx.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  })
  if (!user) throw new NotFoundError('User')
  if (!isAppRole(user.role) || !hasMinimumRole(caller.role, user.role)) {
    throw new ForbiddenError('You cannot manage this user')
  }
  if (user.role === 'super_admin' && caller.role !== 'super_admin') {
    throw new ForbiddenError('Only a super admin can manage super admin accounts')
  }
  return user
}

export const userService = {
  async getAll(): Promise<User[]> {
    return userRepository.findAll()
  },

  async getById(id: string): Promise<User> {
    const user = await userRepository.findById(id)
    if (!user) throw new NotFoundError('User')
    return user
  },

  async create(data: UserDto): Promise<User> {
    const existing = await userRepository.findByEmail(data.email)
    if (existing) throw new ConflictError('A user with this email already exists')
    return userRepository.create({ ...data, email: data.email.trim().toLowerCase() })
  },

  async updateRole(id: string, role: AppRole, caller: UserManager): Promise<void> {
    if (id === caller.id) throw new ForbiddenError('You cannot change your own role')
    if (!hasMinimumRole(caller.role, role)) {
      throw new ForbiddenError('You cannot assign a role above your own')
    }

    await prisma.$transaction(
      async (tx) => {
        const user = await findManagedUser(tx, id, caller)
        if (user.role === 'super_admin' && role !== 'super_admin') {
          await this.ensureAnotherSuperAdmin(tx, id)
        }

        await tx.user.update({ where: { id }, data: { role } })
        await tx.authSession.deleteMany({ where: { userId: id } })
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async delete(id: string, caller: UserManager): Promise<void> {
    await prisma.$transaction(
      async (tx) => {
        const user = await findManagedUser(tx, id, caller)
        if (user.role === 'super_admin') await this.ensureAnotherSuperAdmin(tx, id)
        await tx.user.delete({ where: { id } })
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async setSuspended(id: string, isSuspended: boolean, caller: UserManager): Promise<void> {
    await prisma.$transaction(
      async (tx) => {
        await findManagedUser(tx, id, caller)
        await tx.user.update({ where: { id }, data: { isSuspended } })
        if (isSuspended) {
          await tx.authSession.deleteMany({ where: { userId: id } })
        }
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async updatePassword(id: string, password: string, caller: UserManager): Promise<void> {
    const context = await auth.$context
    const hashedPassword = await context.password.hash(password)

    await prisma.$transaction(
      async (tx) => {
        await findManagedUser(tx, id, caller)
        const credential = await tx.authAccount.findFirst({
          where: { userId: id, providerId: 'credential' },
          select: { id: true },
        })

        if (credential) {
          await tx.authAccount.update({
            where: { id: credential.id },
            data: { password: hashedPassword },
          })
        } else {
          await tx.authAccount.create({
            data: {
              accountId: id,
              providerId: 'credential',
              userId: id,
              password: hashedPassword,
            },
          })
        }

        await tx.authSession.deleteMany({ where: { userId: id } })
      },
      { isolationLevel: 'Serializable' },
    )
  },

  async ensureAnotherSuperAdmin(tx: Prisma.TransactionClient, excludedId: string): Promise<void> {
    const remaining = await tx.user.count({
      where: { role: 'super_admin', id: { not: excludedId } },
    })
    if (remaining === 0) {
      throw new ForbiddenError('The last super admin cannot be demoted or deleted')
    }
  },
}
