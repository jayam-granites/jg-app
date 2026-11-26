import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type {
  CreateResourceContactFormData,
  UpdateResourceContactFormData,
} from '@jg-app/validators'

const api = client as any

export type TradeContactType =
  | 'ENGINEER'
  | 'BUILDER'
  | 'MASTRI'
  | 'PLUMBER'
  | 'ELECTRICIAN'
  | 'LABOR_LOADING'
  | 'OTHER_UTILITY'

export type TierGroup = 'GOLD' | 'SILVER' | 'BRONZE'

export type ResourceRow = {
  id: number
  name: string
  mobile: string | null
  contactType: TradeContactType
  tierGroup: TierGroup | null
  productNotes: string | null
  address: string | null
  isActive: boolean
}

export type ResourceFilters = {
  contactType?: TradeContactType
  tierGroup?: TierGroup
}

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => {
      const query: Record<string, string> = {}
      if (filters.contactType) query.contactType = filters.contactType
      if (filters.tierGroup) query.tierGroup = filters.tierGroup
      return api.api.resources.$get({ query }).then((response: Response) => response.json()) as Promise<{
        data: ResourceRow[]
      }>
    },
  })
}

export function useCreateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateResourceContactFormData) => {
      const response = await api.api.resources.$post({ json: data })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to create resource')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

export function useUpdateResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateResourceContactFormData
    }) => {
      const response = await api.api.resources[':id'].$put({
        param: { id: String(id) },
        json: data,
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to update resource')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

export function useArchiveResource() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.api.resources[':id'].$delete({
        param: { id: String(id) },
      })
      if (!response.ok) throw new Error('Failed to archive resource')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}
