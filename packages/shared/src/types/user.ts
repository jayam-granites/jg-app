import type { AppRole } from '../roles'

export type User = {
  id: string
  name: string
  email: string
  role: AppRole
  isSuspended: boolean
  createdAt: string
  updatedAt: string
}

export type UserDto = {
  name: string
  email: string
  password: string
  role: AppRole
}
