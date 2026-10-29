import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateSupplierFormData, UpdateSupplierFormData } from '@jg-app/validators'

const api = client as any

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: () =>
      api.api.suppliers.$get().then((r: Response) => r.json()) as Promise<{
        data: {
          id: number
          name: string
          mobile: string | null
          address: string | null
          gstNumber: string | null
          bankName: string | null
          accountNumber: string | null
          ifscCode: string | null
          branchName: string | null
          upiId: string | null
          isActive: boolean
        }[]
      }>,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateSupplierFormData) => {
      const response = await api.api.suppliers.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create supplier'
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
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSupplierFormData }) => {
      const response = await api.api.suppliers[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update supplier'
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
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}
