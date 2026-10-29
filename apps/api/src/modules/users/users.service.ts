import { userRepository } from './users.repository'
import { NotFoundError, ConflictError } from '#/lib/errors'
import type { User } from '@jg-app/shared'

export const userService = {
  async getAll(): Promise<User[]> {
    return userRepository.findAll()
  },

  async getById(id: string): Promise<User> {
    const user = await userRepository.findById(id)
    if (!user) throw new NotFoundError('User')
    return user
  },

  async create(data: { name: string; email: string }): Promise<User> {
    const existing = await userRepository.findByEmail(data.email)
    if (existing) throw new ConflictError('A user with this email already exists')
    return userRepository.create(data)
  },

  async delete(id: string): Promise<void> {
    await this.getById(id)
    await userRepository.delete(id)
  },
}
