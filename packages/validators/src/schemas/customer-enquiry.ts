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

export const EnquiryStatusEnum = enum_({
  NEW: 'NEW',
  QUOTED: 'QUOTED',
  NEGOTIATING: 'NEGOTIATING',
  WON: 'WON',
  LOST: 'LOST',
})

const customerName = pipe(string(), minLength(1, 'Customer name is required'))
const mobile = pipe(string(), minLength(1, 'Mobile number is required'))
const materialInterest = pipe(string(), minLength(1, 'Material interest is required'))
const quantity = pipe(number(), minValue(0), maxValue(99_999_999.99))
const quotedPrice = pipe(number(), minValue(0), maxValue(9_999_999_999.99))

export const CreateCustomerEnquirySchema = object({
  customerName,
  mobile,
  siteLocation: optional(string()),
  materialInterest,
  sizeOrUnit: optional(string()),
  quantity: optional(quantity),
  quotedPrice: optional(quotedPrice),
  notes: optional(string()),
  status: optional(EnquiryStatusEnum),
  isActive: optional(boolean()),
})

export const UpdateCustomerEnquirySchema = object({
  customerName: optional(customerName),
  mobile: optional(mobile),
  siteLocation: optional(string()),
  materialInterest: optional(materialInterest),
  sizeOrUnit: optional(string()),
  quantity: optional(quantity),
  quotedPrice: optional(quotedPrice),
  notes: optional(string()),
  status: optional(EnquiryStatusEnum),
  isActive: optional(boolean()),
})

export type CreateCustomerEnquiryFormData = {
  customerName: string
  mobile: string
  siteLocation?: string
  materialInterest: string
  sizeOrUnit?: string
  quantity?: number
  quotedPrice?: number
  notes?: string
  status?: 'NEW' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST'
  isActive?: boolean
}

export type UpdateCustomerEnquiryFormData = Partial<CreateCustomerEnquiryFormData>
