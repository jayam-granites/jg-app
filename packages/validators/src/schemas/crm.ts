import { enum_, object, optional, string } from 'valibot'
import { TierGroupEnum } from './resource-contact'

export const CrmEntityTypeEnum = enum_({
  enquiry: 'enquiry',
  resource: 'resource',
  customer: 'customer',
  supplier: 'supplier',
  broker: 'broker',
  transport: 'transport',
})

export const CrmTierGroupEnum = TierGroupEnum

export const CrmContactQuerySchema = object({
  search: optional(string()),
  entityType: optional(CrmEntityTypeEnum),
  tierGroup: optional(TierGroupEnum),
})

export type CrmEntityType =
  | 'enquiry'
  | 'resource'
  | 'customer'
  | 'supplier'
  | 'broker'
  | 'transport'

export type CrmTierGroup = 'GOLD' | 'SILVER' | 'BRONZE'

export type CrmContactQuery = {
  search?: string
  entityType?: CrmEntityType
  tierGroup?: CrmTierGroup
}

export type CrmContactQueryFormData = CrmContactQuery

export type CrmContact = {
  id: number
  entityType: 'enquiry' | 'resource' | 'customer' | 'supplier' | 'broker' | 'transport'
  name: string
  mobile: string | null
  categoryLabel: string
  tierGroup?: 'GOLD' | 'SILVER' | 'BRONZE'
  notes?: string | null
  openTasksCount: number
  sourceRoute: string
}
