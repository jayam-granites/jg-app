import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreatePurchaseReceiptFormData, UpdatePurchaseReceiptFormData } from '@jg-app/validators'

const api = client as any

export function usePurchaseReceipts() {
  return useQuery({
    queryKey: ['purchase-receipts'],
    queryFn: () =>
      api.api['purchase-receipts'].$get().then((r: Response) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function usePurchaseReceipt(id: number | null) {
  return useQuery({
    queryKey: ['purchase-receipts', id],
    queryFn: () =>
      api.api['purchase-receipts'][':id'].$get({ param: { id: String(id!) } }).then((r: Response) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreatePurchaseReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePurchaseReceiptFormData) => {
      const response = await api.api['purchase-receipts'].$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create purchase receipt'
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
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useUpdatePurchaseReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePurchaseReceiptFormData }) => {
      const response = await api.api['purchase-receipts'][':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update purchase receipt'
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
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] })
    },
  })
}

export function useDeletePurchaseReceipt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.api['purchase-receipts'][':id'].$delete({ param: { id: String(id) } })
      if (!response.ok) {
        let message = 'Failed to delete purchase receipt'
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
      queryClient.invalidateQueries({ queryKey: ['purchase-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
