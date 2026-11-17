import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type {
  CreateResourceContactFormData,
  UpdateResourceContactFormData,
} from '@jg-app/validators'

const api = client as any

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: () =>
      api.api.resources.$get().then((response: Response) => response.json()) as Promise<{
        data: {
          id: number
          name: string
          category: CreateResourceContactFormData['category']
          mobile: string | null
          address: string | null
          stdWageRate: number | string | null
          isAvailable: boolean
          notes: string | null
          isActive: boolean
        }[]
      }>,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resources'] }),
  })
}
