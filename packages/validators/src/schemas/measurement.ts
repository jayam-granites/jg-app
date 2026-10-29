import { array, number, object, optional, string, boolean } from 'valibot'

export const CreateMeasurementSchema = object({
  name: optional(string()),
  phone: optional(string()),
  address: optional(string()),
  notes: optional(string()),
  productIds: optional(array(number())),
})

export type CreateMeasurementFormData = {
  name?: string
  phone?: string
  address?: string
  notes?: string
  productIds?: number[]
}

export const UpdateMeasurementSchema = object({
  name: optional(string()),
  phone: optional(string()),
  address: optional(string()),
  notes: optional(string()),
  isActive: optional(boolean()),
})

export type UpdateMeasurementFormData = {
  name?: string
  phone?: string
  address?: string
  notes?: string
  isActive?: boolean
}
