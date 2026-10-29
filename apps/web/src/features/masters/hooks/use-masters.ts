import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateCategoryFormData, UpdateCategoryFormData, CreateUnitFormData, UpdateUnitFormData, CreateAttributeFormData, UpdateAttributeFormData } from '@jg-app/validators'

const api = client as any

export function useCategories(type?: 'PRODUCT' | 'EXPENSE' | 'SERVICE' | 'PURCHASE') {
  return useQuery({
    queryKey: ['masters', 'categories', type || 'all'],
    queryFn: () =>
      api.api.masters.categories
        .$get({ query: type ? { type } : {} })
        .then((r: Response) => r.json()) as Promise<{
        data: { id: number; name: string; type: string; parentId: number | null; isActive: boolean }[]
      }>,
  })
}

export function useUnits() {
  return useQuery({
    queryKey: ['masters', 'units'],
    queryFn: () =>
      api.api.masters.units.$get().then((r: Response) => r.json()) as Promise<{
        data: { id: number; code: string; name: string; isActive: boolean }[]
      }>,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateCategoryFormData) => {
      const response = await api.api.masters.categories.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create category'
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
    onSuccess: (result: any, variables) => {
      const category = result?.data
      if (category) {
        queryClient.setQueryData(['masters', 'categories', variables.type], (old: any) => {
          const existing: any[] = old?.data ?? []
          if (existing.some((item) => item.id === category.id)) return old
          return {
            ...old,
            data: [...existing, category].sort((a, b) => String(a.name).localeCompare(String(b.name))),
          }
        })
      }
      queryClient.invalidateQueries({ queryKey: ['masters', 'categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateCategoryFormData }) => {
      const response = await api.api.masters['categories'][':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update category'
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
      queryClient.invalidateQueries({ queryKey: ['masters', 'categories'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUnitFormData }) => {
      const response = await api.api.masters.units[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update unit'
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
      queryClient.invalidateQueries({ queryKey: ['masters', 'units'] })
    },
  })
}

export function useUpdateAttribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateAttributeFormData }) => {
      const response = await api.api.masters.attributes[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update attribute'
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
      queryClient.invalidateQueries({ queryKey: ['masters', 'attributes'] })
    },
  })
}

export function useAttributes() {
  return useQuery({
    queryKey: ['masters', 'attributes'],
    queryFn: () =>
      api.api.masters.attributes.$get().then((r: Response) => r.json()) as Promise<{
        data: { id: number; code: string; name: string; isActive: boolean; _count: { values: number } }[]
      }>,
  })
}

export function useCreateAttribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAttributeFormData) => {
      const response = await api.api.masters.attributes.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create attribute'
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
      queryClient.invalidateQueries({ queryKey: ['masters', 'attributes'] })
    },
  })
}

export function useCategoryAttributes(categoryId: number | null) {
  return useQuery({
    queryKey: ['masters', 'categories', categoryId, 'attributes'],
    queryFn: async () => {
      const res = await (api.api.masters.categories[':id'].attributes.$get({
        param: { id: String(categoryId!) },
      }) as Promise<Response>)
      return (await res.json()) as {
        data: { id: number; code: string; name: string; isActive: boolean; isRequired: boolean }[]
      }
    },
    enabled: !!categoryId,
  })
}

export function useLinkCategoryAttributes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      categoryId,
      attributes,
    }: {
      categoryId: number
      attributes: { attributeId: number; isRequired: boolean }[]
    }) => {
      const res = await (api.api.masters.categories[':id'].attributes.$put({
        param: { id: String(categoryId) },
        json: { attributes },
      }) as Promise<Response>)
      if (!res.ok) {
        let message = 'Failed to link attributes'
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
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['masters', 'categories', vars.categoryId, 'attributes'] })
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateUnitFormData) => {
      const response = await api.api.masters.units.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create unit'
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
      queryClient.invalidateQueries({ queryKey: ['masters', 'units'] })
    },
  })
}

export function useAttributeValues(attributeId: number | null) {
  return useQuery({
    queryKey: ['masters', 'attribute-values', attributeId],
    queryFn: async () => {
      const res = await (api.api.masters['attribute-values'].$get({
        query: attributeId ? { attributeId: String(attributeId) } : {},
      }) as Promise<Response>)
      return (await res.json()) as { data: { id: number; value: string; attributeId: number }[] }
    },
    enabled: !!attributeId,
  })
}
