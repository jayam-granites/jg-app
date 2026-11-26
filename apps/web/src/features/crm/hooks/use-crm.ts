import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'

const api = client as any

export type CrmEntityType =
  | 'enquiry'
  | 'resource'
  | 'customer'
  | 'supplier'
  | 'broker'
  | 'transport'

export type TierGroup = 'GOLD' | 'SILVER' | 'BRONZE'

export type CrmContact = {
  id: number
  entityType: CrmEntityType
  name: string
  mobile: string | null
  categoryLabel: string
  tierGroup?: TierGroup | null
  notes?: string | null
  openTasksCount: number
  sourceRoute: string
  isActive?: boolean
}

export type CrmContactFilters = {
  search?: string
  entityType?: CrmEntityType
  tierGroup?: TierGroup
}

export function useCrmContacts(filters: CrmContactFilters = {}) {
  return useQuery({
    queryKey: ['crm', 'contacts', filters],
    queryFn: () => {
      const query: Record<string, string> = {}
      if (filters.search) query.search = filters.search
      if (filters.entityType) query.entityType = filters.entityType
      if (filters.tierGroup) query.tierGroup = filters.tierGroup
      return api.api.crm.contacts.$get({ query }).then((response: Response) => response.json()) as Promise<{
        data: CrmContact[]
      }>
    },
  })
}
