import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreatePurchaseOrderFormData, UpdatePurchaseOrderFormData } from '@jg-app/validators'

const api = client as any

export function usePurchaseOrders() {
  return useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () =>
      api.api['purchase-orders'].$get().then((r: Response) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function usePurchaseOrder(id: number | null) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () =>
      api.api['purchase-orders'][':id'].$get({ param: { id: String(id!) } }).then((r: Response) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderFormData) => {
      const response = await api.api['purchase-orders'].$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create purchase order'
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

export function useUpdatePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePurchaseOrderFormData }) => {
      const response = await api.api['purchase-orders'][':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update purchase order'
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
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}

export function useDeletePurchaseOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      api.api['purchase-orders'][':id'].$delete({ param: { id: String(id) } }).then((r: Response) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
    },
  })
}
