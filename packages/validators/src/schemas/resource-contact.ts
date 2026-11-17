import {
  boolean,
  enum_,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  optional,
  pipe,
  string,
} from 'valibot'

export const ResourceCategoryEnum = enum_({
  ENGINEER: 'ENGINEER',
  BUILDER: 'BUILDER',
  MASTRI: 'MASTRI',
  PLUMBER: 'PLUMBER',
  ELECTRICIAN: 'ELECTRICIAN',
  LABOR_LOADING: 'LABOR_LOADING',
  OTHER_UTILITY: 'OTHER_UTILITY',
})

const name = pipe(string(), minLength(1, 'Name is required'))
const wageRate = pipe(number(), minValue(0), maxValue(99_999_999.99))

export const CreateResourceContactSchema = object({
  name,
  category: ResourceCategoryEnum,
  mobile: optional(string()),
  address: optional(string()),
  stdWageRate: optional(wageRate),
  isAvailable: optional(boolean()),
  notes: optional(string()),
  isActive: optional(boolean()),
})

export const UpdateResourceContactSchema = object({
  name: optional(name),
  category: optional(ResourceCategoryEnum),
  mobile: optional(string()),
  address: optional(string()),
  stdWageRate: optional(wageRate),
  isAvailable: optional(boolean()),
  notes: optional(string()),
  isActive: optional(boolean()),
})

export type CreateResourceContactFormData = {
  name: string
  category:
    | 'ENGINEER'
    | 'BUILDER'
    | 'MASTRI'
    | 'PLUMBER'
    | 'ELECTRICIAN'
    | 'LABOR_LOADING'
    | 'OTHER_UTILITY'
  mobile?: string
  address?: string
  stdWageRate?: number
  isAvailable?: boolean
  notes?: string
  isActive?: boolean
}

export type UpdateResourceContactFormData = Partial<CreateResourceContactFormData>
