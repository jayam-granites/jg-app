import { email, minLength, object, pipe, string } from 'valibot'

export const UserSchema = object({
  name: pipe(string(), minLength(1, 'Name is required')),
  email: pipe(string(), email('Invalid email address')),
})

export type UserFormData = { name: string; email: string }
