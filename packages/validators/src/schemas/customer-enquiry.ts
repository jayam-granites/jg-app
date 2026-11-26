import {
  boolean,
  enum_,
  minLength,
  object,
  optional,
  pipe,
  string,
} from 'valibot'

export const EnquiryStatusEnum = enum_({
  OPEN: 'OPEN',
  FOLLOW_UP_1: 'FOLLOW_UP_1',
  FOLLOW_UP_2: 'FOLLOW_UP_2',
  CLOSED_WON: 'CLOSED_WON',
  CLOSED_LOST: 'CLOSED_LOST',
})

const customerName = pipe(string(), minLength(1, 'Customer name is required'))
const mobile = pipe(string(), minLength(1, 'Mobile number is required'))
const requirementsNotes = pipe(
  string(),
  minLength(1, 'Requirements notes are required'),
)

export const CreateCustomerEnquirySchema = object({
  customerName,
  mobile,
  requirementsNotes,
  status: optional(EnquiryStatusEnum),
  closeReason: optional(string()),
  isActive: optional(boolean()),
})

export const UpdateCustomerEnquirySchema = object({
  customerName: optional(customerName),
  mobile: optional(mobile),
  requirementsNotes: optional(requirementsNotes),
  status: optional(EnquiryStatusEnum),
  closeReason: optional(string()),
  isActive: optional(boolean()),
  followUpDueDate: optional(string()),
})

export type CreateCustomerEnquiryFormData = {
  customerName: string
  mobile: string
  requirementsNotes: string
  status?: 'OPEN' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'CLOSED_WON' | 'CLOSED_LOST'
  closeReason?: string
  isActive?: boolean
}

export type UpdateCustomerEnquiryFormData = Partial<CreateCustomerEnquiryFormData> & {
  followUpDueDate?: string
}
