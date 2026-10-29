import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

type ProductsResponse = { data: any[] }

async function fetchProducts(): Promise<ProductsResponse> {
  const res = await client.api.products.$get()
  return res.json() as Promise<ProductsResponse>
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
  })
}

export function useProduct(id: number | null) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const res = await (client.api.products[':id'].$get({ param: { id: String(id!) } }) as Promise<Response>)
      return res.json() as Promise<{ data: any }>
    },
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.api.products.$post({ json: data as never }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      (client.api.products[':id'].$put({
        param: { id: String(id) },
        json: data as never,
      }) as Promise<Response>).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      (client.api.products[':id'].$delete({
        param: { id: String(id) },
      }) as Promise<Response>).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })
}
