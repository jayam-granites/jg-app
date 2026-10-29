import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () =>
      (client.api.invoices.$get() as Promise<Response>).then((r) => r.json()) as Promise<{ data: any[] }>,
  })
}

export function useInvoice(id: number | null) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () =>
      (client.api.invoices[':id'].$get({ param: { id: String(id!) } }) as Promise<Response>).then((r) => r.json()) as Promise<{ data: any }>,
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await (client.api.invoices.$post({ json: data as never }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to create invoice')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await (client.api.invoices[':id'].$put({ param: { id: String(id) }, json: data as never }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to update invoice')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useRecordInvoicePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: number; data: Record<string, unknown> }) => {
      const res = await (client.api.invoices[':id'].payments.$post({
        param: { id: String(invoiceId) },
        json: data as never,
      }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to record payment')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useDeleteInvoicePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, paymentId }: { invoiceId: number; paymentId: number }) => {
      const res = await (client.api.invoices[':id'].payments[':paymentId'].$delete({
        param: { id: String(invoiceId), paymentId: String(paymentId) },
      }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to delete payment')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useCreateInvoiceCommission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: number; data: Record<string, unknown> }) => {
      const res = await (client.api.invoices[':id'].commissions.$post({
        param: { id: String(invoiceId) },
        json: data as never,
      }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to add commission')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useDeleteInvoiceCommission() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ invoiceId, commissionId }: { invoiceId: number; commissionId: number }) => {
      const res = await (client.api.invoices[':id'].commissions[':commissionId'].$delete({
        param: { id: String(invoiceId), commissionId: String(commissionId) },
      }) as Promise<Response>)
      const json = await res.json()
      if (!res.ok) throw new Error((json as any)?.error?.message || (json as any)?.message || 'Failed to delete commission')
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) =>
      (client.api.invoices[':id'].$delete({ param: { id: String(id) } }) as Promise<Response>).then((r) => r.json()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
