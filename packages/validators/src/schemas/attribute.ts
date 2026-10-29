import { minLength, object, optional, pipe, string, boolean, array } from 'valibot'

export const CreateAttributeSchema = object({
  code: pipe(
    string('Attribute code must be a string'),
    minLength(1, 'Attribute code is required'),
  ),
  name: pipe(
    string('Attribute name must be a string'),
    minLength(1, 'Attribute name is required'),
  ),
  values: optional(array(pipe(string('Attribute value must be a string'), minLength(1, 'Value is required')))),
  isActive: optional(boolean()),
})

export type CreateAttributeFormData = {
  code: string
  name: string
  values?: string[]
  isActive?: boolean
}

export const UpdateAttributeSchema = object({
  code: optional(pipe(string('Attribute code must be a string'), minLength(1, 'Attribute code is required'))),
  name: optional(pipe(string('Attribute name must be a string'), minLength(1, 'Attribute name is required'))),
  values: optional(array(pipe(string('Attribute value must be a string'), minLength(1, 'Value is required')))),
  isActive: optional(boolean()),
})

export type UpdateAttributeFormData = {
  code?: string
  name?: string
  values?: string[]
  isActive?: boolean
}
