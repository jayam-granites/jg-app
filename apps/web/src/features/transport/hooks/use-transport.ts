import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateTransportFormData, UpdateTransportFormData } from '@jg-app/validators'

const api = client as any

export function useTransportProviders() {
  return useQuery({
    queryKey: ['transport'],
    queryFn: () =>
      api.api.transport.$get().then((r: Response) => r.json()) as Promise<{
        data: {
          id: number
          name: string
          mobile: string | null
          vehicleNumber: string | null
          address: string | null
          isActive: boolean
        }[]
      }>,
  })
}

export function useCreateTransport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateTransportFormData) => {
      const response = await api.api.transport.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create transport provider'
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
      queryClient.invalidateQueries({ queryKey: ['transport'] })
    },
  })
}

export function useUpdateTransport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTransportFormData }) => {
      const response = await api.api.transport[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update transport provider'
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
      queryClient.invalidateQueries({ queryKey: ['transport'] })
    },
  })
}
