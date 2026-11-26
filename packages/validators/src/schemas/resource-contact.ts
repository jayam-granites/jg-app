import {
  boolean,
  enum_,
  minLength,
  object,
  optional,
  pipe,
  string,
} from 'valibot'

export const TradeContactTypeEnum = enum_({
  ENGINEER: 'ENGINEER',
  BUILDER: 'BUILDER',
  MASTRI: 'MASTRI',
})

export const TierGroupEnum = enum_({
  GOLD: 'GOLD',
  SILVER: 'SILVER',
  BRONZE: 'BRONZE',
})

const name = pipe(string(), minLength(1, 'Name is required'))
const mobile = pipe(string(), minLength(1, 'Mobile number is required'))

export const CreateResourceContactSchema = object({
  name,
  mobile,
  contactType: TradeContactTypeEnum,
  tierGroup: optional(TierGroupEnum),
  productNotes: optional(string()),
  address: optional(string()),
  isActive: optional(boolean()),
})

export const UpdateResourceContactSchema = object({
  name: optional(name),
  mobile: optional(mobile),
  contactType: optional(TradeContactTypeEnum),
  tierGroup: optional(TierGroupEnum),
  productNotes: optional(string()),
  address: optional(string()),
  isActive: optional(boolean()),
})

export type CreateResourceContactFormData = {
  name: string
  mobile: string
  contactType: 'ENGINEER' | 'BUILDER' | 'MASTRI'
  tierGroup?: 'GOLD' | 'SILVER' | 'BRONZE'
  productNotes?: string
  address?: string
  isActive?: boolean
}

export type UpdateResourceContactFormData = Partial<CreateResourceContactFormData>
