import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateBrokerFormData, UpdateBrokerFormData } from '@jg-app/validators'

const api = client as any

export function useBrokers() {
  return useQuery({
    queryKey: ['brokers'],
    queryFn: () =>
      api.api.brokers.$get().then((r: Response) => r.json()) as Promise<{
        data: {
          id: number
          name: string
          mobile: string | null
          address: string | null
          commissionPercent: number | null
          isActive: boolean
        }[]
      }>,
  })
}

export function useCreateBroker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateBrokerFormData) => {
      const response = await api.api.brokers.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create broker'
        try {
          const errorData = await response.json()
          message = errorData.error?.message || message
        } catch {
          const text = await response.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return response.json()
    },
    onSuccess: (result: any) => {
      const broker = result?.data
      if (broker?.id) {
        queryClient.setQueryData(['brokers'], (old: any) => {
          const existing: any[] = old?.data ?? []
          if (existing.some((item) => item.id === broker.id)) return old
          return {
            ...old,
            data: [...existing, broker].sort((a, b) => String(a.name).localeCompare(String(b.name))),
          }
        })
      }
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
  })
}

export function useUpdateBroker() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateBrokerFormData }) => {
      const response = await api.api.brokers[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update broker'
        try {
          const errorData = await response.json()
          message = errorData.error?.message || message
        } catch {
          const text = await response.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokers'] })
    },
  })
}
