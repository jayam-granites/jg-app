import { minLength, object, optional, pipe, string, boolean } from 'valibot'

export const CreateSupplierSchema = object({
  name: pipe(
    string('Supplier name must be a string'),
    minLength(1, 'Supplier name is required'),
  ),
  mobile: optional(string()),
  address: optional(string()),
  gstNumber: optional(string()),
  bankName: optional(string()),
  accountNumber: optional(string()),
  ifscCode: optional(string()),
  branchName: optional(string()),
  upiId: optional(string()),
  isActive: optional(boolean()),
})

export type CreateSupplierFormData = {
  name: string
  mobile?: string
  address?: string
  gstNumber?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  branchName?: string
  upiId?: string
  isActive?: boolean
}

export const UpdateSupplierSchema = object({
  name: optional(pipe(string('Supplier name must be a string'), minLength(1, 'Supplier name is required'))),
  mobile: optional(string()),
  address: optional(string()),
  gstNumber: optional(string()),
  bankName: optional(string()),
  accountNumber: optional(string()),
  ifscCode: optional(string()),
  branchName: optional(string()),
  upiId: optional(string()),
  isActive: optional(boolean()),
})

export type UpdateSupplierFormData = {
  name?: string
  mobile?: string
  address?: string
  gstNumber?: string
  bankName?: string
  accountNumber?: string
  ifscCode?: string
  branchName?: string
  upiId?: string
  isActive?: boolean
}
