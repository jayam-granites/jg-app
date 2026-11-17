import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

export type UpiProfile = {
  id: number
  payeeVPA: string
  payeeName: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type UpiProfileInput = {
  payeeVPA: string
  payeeName: string
  isDefault: boolean
}

type DataResponse<T> = {
  data: T
  error?: { message?: string }
}

async function getResponseData<T>(response: Response, fallback: string): Promise<T> {
  const body = await response.json() as DataResponse<T>
  if (!response.ok) throw new Error(body.error?.message || fallback)
  return body.data
}

export function useUpiProfiles() {
  return useQuery({
    queryKey: ['upi-profiles'],
    queryFn: async () => {
      const response = await (client.api['upi-profiles'].$get() as Promise<Response>)
      return getResponseData<UpiProfile[]>(response, 'Failed to load UPI profiles')
    },
  })
}

export function useCreateUpiProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: UpiProfileInput) => {
      const response = await (client.api['upi-profiles'].$post({ json: data }) as Promise<Response>)
      return getResponseData<UpiProfile>(response, 'Failed to create UPI profile')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['upi-profiles'] }),
  })
}

export function useUpdateUpiProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UpiProfileInput> }) => {
      const response = await (client.api['upi-profiles'][':id'].$put({
        param: { id: String(id) },
        json: data,
      }) as Promise<Response>)
      return getResponseData<UpiProfile>(response, 'Failed to update UPI profile')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['upi-profiles'] }),
  })
}

export function useDeleteUpiProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await (client.api['upi-profiles'][':id'].$delete({
        param: { id: String(id) },
      }) as Promise<Response>)
      return getResponseData<null>(response, 'Failed to delete UPI profile')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['upi-profiles'] }),
  })
}
