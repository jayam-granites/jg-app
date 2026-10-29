import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: () =>
      (client.api.customers.$get() as Promise<Response>).then((r) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function useCustomer(id: number | null) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () =>
      (client.api.customers[':id'].$get({ param: { id: String(id!) } }) as Promise<Response>).then((r) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      (client.api.customers.$post({ json: data as never }) as Promise<Response>).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await (client.api.customers[':id'].$put({ param: { id: String(id) }, json: data as never }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to update customer')
      return json
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
    },
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      (client.api.customers[':id'].$delete({ param: { id: String(id) } }) as Promise<Response>).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
