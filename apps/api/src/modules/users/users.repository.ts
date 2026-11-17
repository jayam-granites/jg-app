import { prisma } from '#/lib/prisma'
import type { AppRole, User } from '@jg-app/shared'
import { auth } from '#/lib/auth'

export const userRepository = {
  async findAll(): Promise<User[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    })
    return users.map((user) => ({
      ...user,
      role: user.role as AppRole,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))
  },

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuspended: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) return null
    return {
      ...user,
      role: user.role as AppRole,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } })
  },

  async create(data: { name: string; email: string; password: string; role: AppRole }): Promise<User> {
    const context = await auth.$context
    const password = await context.password.hash(data.password)
    const user = await context.internalAdapter.createUser(
      {
        name: data.name,
        email: data.email,
        emailVerified: false,
        role: data.role,
      },
      { method: 'email-password' },
    )

    try {
      await context.internalAdapter.linkAccount({
        userId: user.id,
        providerId: 'credential',
        accountId: user.id,
        password,
      })
    } catch (error) {
      await prisma.user.delete({ where: { id: user.id } })
      throw error
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as AppRole,
      isSuspended: user.isSuspended,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  },
}
