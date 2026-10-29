import { minLength, number, object, optional, pipe, string, boolean } from 'valibot'

export const CreateBrokerSchema = object({
  name: pipe(
    string('Broker name must be a string'),
    minLength(1, 'Broker name is required'),
  ),
  mobile: optional(string()),
  address: optional(string()),
  commissionPercent: optional(number()),
  isActive: optional(boolean()),
})

export type CreateBrokerFormData = {
  name: string
  mobile?: string
  address?: string
  commissionPercent?: number
  isActive?: boolean
}

export const UpdateBrokerSchema = object({
  name: optional(pipe(string('Broker name must be a string'), minLength(1, 'Broker name is required'))),
  mobile: optional(string()),
  address: optional(string()),
  commissionPercent: optional(number()),
  isActive: optional(boolean()),
})

export type UpdateBrokerFormData = {
  name?: string
  mobile?: string
  address?: string
  commissionPercent?: number
  isActive?: boolean
}
