import { prisma } from '#/lib/prisma'
import type { User } from '@jg-app/shared'

export const userRepository = {
  findAll(): Promise<User[]> {
    return prisma.user.findMany() as unknown as Promise<User[]>
  },

  findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } }) as unknown as Promise<User | null>
  },

  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } }) as unknown as Promise<User | null>
  },

  create(data: Pick<User, 'name' | 'email'>): Promise<User> {
    return prisma.user.create({ data }) as unknown as Promise<User>
  },

  delete(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } }) as unknown as Promise<User>
  },
}
