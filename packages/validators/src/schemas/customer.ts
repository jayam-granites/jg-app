import { minLength, object, optional, pipe, string, boolean } from 'valibot'

export const CreateCustomerSchema = object({
  name: pipe(string('Name must be a string'), minLength(1, 'Name is required')),
  mobile: optional(string()),
  alternateMobile: optional(string()),
  address: optional(string()),
  city: optional(string()),
  state: optional(string()),
  pincode: optional(string()),
  gstNumber: optional(string()),
  isActive: optional(boolean()),
})

export type CreateCustomerFormData = {
  name: string
  mobile?: string
  alternateMobile?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstNumber?: string
  isActive?: boolean
}

export const UpdateCustomerSchema = object({
  name: optional(pipe(string('Name must be a string'), minLength(1, 'Name is required'))),
  mobile: optional(string()),
  alternateMobile: optional(string()),
  address: optional(string()),
  city: optional(string()),
  state: optional(string()),
  pincode: optional(string()),
  gstNumber: optional(string()),
  isActive: optional(boolean()),
})

export type UpdateCustomerFormData = {
  name?: string
  mobile?: string
  alternateMobile?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  gstNumber?: string
  isActive?: boolean
}
