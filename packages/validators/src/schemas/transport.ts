import { minLength, object, optional, pipe, string, boolean } from 'valibot'

export const CreateTransportSchema = object({
  name: pipe(
    string('Transport provider name must be a string'),
    minLength(1, 'Transport provider name is required'),
  ),
  mobile: optional(string()),
  vehicleNumber: optional(string()),
  address: optional(string()),
  isActive: optional(boolean()),
})

export type CreateTransportFormData = {
  name: string
  mobile?: string
  vehicleNumber?: string
  address?: string
  isActive?: boolean
}

export const UpdateTransportSchema = object({
  name: optional(pipe(string('Transport provider name must be a string'), minLength(1, 'Transport provider name is required'))),
  mobile: optional(string()),
  vehicleNumber: optional(string()),
  address: optional(string()),
  isActive: optional(boolean()),
})

export type UpdateTransportFormData = {
  name?: string
  mobile?: string
  vehicleNumber?: string
  address?: string
  isActive?: boolean
}
