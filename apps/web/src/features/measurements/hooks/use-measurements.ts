import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateSlabFormData, UpdateSlabFormData } from '@jg-app/validators'

const api = client as any

export function useMeasurements() {
  return useQuery({
    queryKey: ['measurements'],
    queryFn: () =>
      api.api.measurements.$get().then((r: Response) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function useMeasurement(id: number | null) {
  return useQuery({
    queryKey: ['measurements', id],
    queryFn: () =>
      api.api.measurements[':id'].$get({ param: { id: String(id!) } }).then((r: Response) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreateMeasurement() {
  return useMutation({
    mutationFn: async (data: { name?: string; phone?: string; address?: string; notes?: string }) => {
      const res = await api.api.measurements.$post({ json: data })
      if (!res.ok) {
        let message = 'Failed to create measurement'
        try {
          const err = await res.json()
          message = err.error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
  })
}

export function useUpdateMeasurement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name?: string; phone?: string; address?: string; notes?: string; isActive?: boolean } }) => {
      const res = await api.api.measurements[':id'].$put({ param: { id: String(id) }, json: data })
      if (!res.ok) {
        let message = 'Failed to update measurement'
        try {
          const err = await res.json()
          message = err.error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
    },
  })
}

export function useDeleteMeasurement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await api.api.measurements[':id'].$delete({ param: { id: String(id) } })
      if (!res.ok) {
        let message = 'Failed to delete measurement'
        try {
          const err = await res.json()
          message = err.error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
    },
  })
}

export function useSlabsByMeasurement(measurementId: number | null) {
  return useQuery({
    queryKey: ['slabs', 'by-measurement', measurementId],
    queryFn: async () => {
      const res = await (client.api.slabs['by-measurement'][':measurementId'].$get({
        param: { measurementId: String(measurementId!) },
      }) as Promise<Response>)
      return res.json() as Promise<{ data: any[] }>
    },
    enabled: !!measurementId,
  })
}

export function useAllSlabs() {
  return useQuery({
    queryKey: ['slabs', 'all'],
    queryFn: async () => {
      const res = await (client.api.slabs.$get() as Promise<Response>)
      return res.json() as Promise<{ data: any[] }>
    },
  })
}

export function useSlabs(productId: number | null) {
  return useQuery({
    queryKey: ['slabs', productId],
    queryFn: async () => {
      const res = await (client.api.slabs[':productId'].$get({
        param: { productId: String(productId!) },
      }) as Promise<Response>)
      return res.json() as Promise<{
        data: {
          id: number
          productId: number
          slabNumber: number
          width: number
          height: number
          area: number
          isActive: boolean
        }[]
      }>
    },
    enabled: !!productId,
  })
}

export function useCreateSlab() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSlabFormData) => {
      const res = await (client.api.slabs.$post({ json: data as never }) as Promise<Response>)
      if (!res.ok) {
        let message = 'Failed to create slab'
        try {
          const err = await res.json()
          message = (err as any).error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['slabs', vars.productId] })
      queryClient.invalidateQueries({ queryKey: ['slabs', 'all'] })
      queryClient.invalidateQueries({ queryKey: ['slabs', 'by-measurement'] })
      queryClient.invalidateQueries({ queryKey: ['measurements'] })
    },
  })
}

export function useUpdateSlab() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data, productId: _productId }: { id: number; data: UpdateSlabFormData; productId: number }) => {
      const res = await (client.api.slabs[':id'].$put({
        param: { id: String(id) },
        json: data as never,
      }) as Promise<Response>)
      if (!res.ok) {
        let message = 'Failed to update slab'
        try {
          const err = await res.json()
          message = (err as any).error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['slabs', vars.productId] })
      queryClient.invalidateQueries({ queryKey: ['slabs', 'all'] })
    },
  })
}

export function useDeleteSlab() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, productId: _productId }: { id: number; productId: number }) => {
      const res = await (client.api.slabs[':id'].$delete({ param: { id: String(id) } }) as Promise<Response>)
      if (!res.ok) {
        let message = 'Failed to delete slab'
        try {
          const err = await res.json()
          message = (err as any).error?.message || message
        } catch {
          const text = await res.text().catch(() => '')
          if (text) message = text
        }
        throw new Error(message)
      }
      return res.json()
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['slabs', vars.productId] })
      queryClient.invalidateQueries({ queryKey: ['slabs', 'all'] })
    },
  })
}
