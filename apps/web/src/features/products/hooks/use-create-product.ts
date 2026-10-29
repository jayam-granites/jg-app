import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

type MastersResponse = { data: { id: number; name: string; code?: string; parentId?: number; type?: string }[] }

type CreateProductDto = {
  name: string
  categoryId: number
  description?: string
  hsnCode?: string
  lotNumber?: string
  variants: {
    skuCode: string
    unitId: number
    secondaryUnitId?: number | null
    attributes?: { attributeId: number; attributeValueId: number }[]
  }[]
}

const api = client as any

export function useProductCategories() {
  return useQuery({
    queryKey: ['masters', 'categories', 'product'],
    queryFn: async () => {
      const res = await api.api.masters.categories.$get({ query: { type: 'PRODUCT' } }) as Response
      return res.json() as Promise<MastersResponse>
    },
  })
}

export function useUnits() {
  return useQuery({
    queryKey: ['masters', 'units'],
    queryFn: async () => {
      const res = await api.api.masters.units.$get() as Response
      return res.json() as Promise<MastersResponse>
    },
  })
}

export function useAttributes() {
  return useQuery({
    queryKey: ['masters', 'attributes'],
    queryFn: async () => {
      const res = await api.api.masters.attributes.$get() as Response
      return res.json() as Promise<MastersResponse>
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
      return res.json() as Promise<{ data: { id: number; value: string; attributeId: number }[] }>
    },
    enabled: !!attributeId,
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
        data: { id: number; code: string; name: string; isRequired: boolean }[]
      }
    },
    enabled: !!categoryId,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateProductDto) =>
      (api.api.products.$post({ json: data }) as Promise<Response>).then((r: Response) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}
