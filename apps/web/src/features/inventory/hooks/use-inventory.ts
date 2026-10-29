import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateInventoryBatchFormData, UpdateInventoryBatchFormData, UpdateInventorySlabFormData } from '@jg-app/validators'

const api = client as any

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () =>
      api.api.inventory.$get().then((r: Response) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function useAvailableInventory() {
  return useQuery({
    queryKey: ['inventory', 'available'],
    queryFn: () =>
      api.api.inventory.available.$get().then((r: Response) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function useInventoryByVariant(variantId: number | null) {
  return useQuery({
    queryKey: ['inventory', 'variants', variantId],
    queryFn: () =>
      api.api.inventory.variants[':variantId'].$get({ param: { variantId: String(variantId!) } }).then((r: Response) => r.json()) as Promise<{ data: any[] }>,
    enabled: !!variantId,
  })
}

export function useInventoryBatch(id: number | null) {
  return useQuery({
    queryKey: ['inventory', 'batches', id],
    queryFn: () =>
      api.api.inventory.batches[':id'].$get({ param: { id: String(id!) } }).then((r: Response) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreateInventoryBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateInventoryBatchFormData) => {
      const response = await api.api.inventory.batches.$post({ json: data as any })
      if (!response.ok) {
        let message = 'Failed to create inventory batch'
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useUpdateInventoryBatch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInventoryBatchFormData }) => {
      const response = await api.api.inventory.batches[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update batch'
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCreateInventorySlab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.api.inventory.slabs.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create slab'
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useUpdateInventorySlab() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInventorySlabFormData }) => {
      const response = await api.api.inventory.slabs[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update slab'
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
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}
