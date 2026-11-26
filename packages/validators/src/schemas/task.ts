import {
  boolean,
  check,
  enum_,
  integer,
  maxValue,
  minLength,
  minValue,
  number,
  nullable,
  object,
  optional,
  pipe,
  string,
} from 'valibot'

export const PriorityEnum = enum_({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
})

export const TaskStatusEnum = enum_({
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
})

const title = pipe(string(), minLength(1, 'Title is required'))
const dueDate = pipe(
  string(),
  check((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid due date'),
)
const relatedId = pipe(number(), integer(), minValue(1), maxValue(Number.MAX_SAFE_INTEGER))

export const CreateTaskSchema = object({
  title,
  description: optional(string()),
  dueDate,
  priority: optional(PriorityEnum),
  status: optional(TaskStatusEnum),
  enquiryId: optional(relatedId),
  resourceId: optional(relatedId),
  customerId: optional(relatedId),
  supplierId: optional(relatedId),
  brokerId: optional(relatedId),
  transportId: optional(relatedId),
  isActive: optional(boolean()),
})

export const UpdateTaskSchema = object({
  title: optional(title),
  description: optional(string()),
  dueDate: optional(dueDate),
  priority: optional(PriorityEnum),
  status: optional(TaskStatusEnum),
  enquiryId: optional(nullable(relatedId)),
  resourceId: optional(nullable(relatedId)),
  customerId: optional(nullable(relatedId)),
  supplierId: optional(nullable(relatedId)),
  brokerId: optional(nullable(relatedId)),
  transportId: optional(nullable(relatedId)),
  isActive: optional(boolean()),
})

export type CreateTaskFormData = {
  title: string
  description?: string
  dueDate: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  enquiryId?: number
  resourceId?: number
  customerId?: number
  supplierId?: number
  brokerId?: number
  transportId?: number
  isActive?: boolean
}

export type UpdateTaskFormData = Omit<
  Partial<CreateTaskFormData>,
  | 'enquiryId'
  | 'resourceId'
  | 'customerId'
  | 'supplierId'
  | 'brokerId'
  | 'transportId'
> & {
  enquiryId?: number | null
  resourceId?: number | null
  customerId?: number | null
  supplierId?: number | null
  brokerId?: number | null
  transportId?: number | null
}
