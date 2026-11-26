import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type {
  CreateCustomerEnquiryFormData,
  UpdateCustomerEnquiryFormData,
} from '@jg-app/validators'

const api = client as any

export type EnquiryStatus =
  | 'OPEN'
  | 'FOLLOW_UP_1'
  | 'FOLLOW_UP_2'
  | 'CLOSED_WON'
  | 'CLOSED_LOST'

export type EnquiryRow = {
  id: number
  customerName: string
  mobile: string
  requirementsNotes: string | null
  status: EnquiryStatus
  followUpCount: number
  closeReason?: string | null
  followUpDueDate?: string | null
  isActive: boolean
}

export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries'],
    queryFn: () =>
      api.api.enquiries.$get().then((response: Response) => response.json()) as Promise<{
        data: EnquiryRow[]
      }>,
  })
}

export function useCreateEnquiry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateCustomerEnquiryFormData) => {
      const response = await api.api.enquiries.$post({ json: data })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to create enquiry')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

export function useUpdateEnquiry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: UpdateCustomerEnquiryFormData
    }) => {
      const response = await api.api.enquiries[':id'].$put({
        param: { id: String(id) },
        json: data,
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to update enquiry')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

export function useArchiveEnquiry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.api.enquiries[':id'].$delete({
        param: { id: String(id) },
      })
      if (!response.ok) throw new Error('Failed to archive enquiry')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}

export function useLogFollowUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes?: string }) => {
      const response = await api.api.enquiries[':id']['follow-ups'].$post({
        param: { id: String(id) },
        json: notes ? { notes } : {},
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to log follow-up')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['crm'] })
    },
  })
}
