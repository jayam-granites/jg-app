import { minLength, object, optional, pipe, string, boolean } from 'valibot'

export const CreateUnitSchema = object({
  code: pipe(
    string('Unit code must be a string'),
    minLength(1, 'Unit code is required'),
  ),
  name: pipe(
    string('Unit name must be a string'),
    minLength(1, 'Unit name is required'),
  ),
  isActive: optional(boolean()),
})

export type CreateUnitFormData = {
  code: string
  name: string
  isActive?: boolean
}

export const UpdateUnitSchema = object({
  code: optional(pipe(string('Unit code must be a string'), minLength(1, 'Unit code is required'))),
  name: optional(pipe(string('Unit name must be a string'), minLength(1, 'Unit name is required'))),
  isActive: optional(boolean()),
})

export type UpdateUnitFormData = {
  code?: string
  name?: string
  isActive?: boolean
}
