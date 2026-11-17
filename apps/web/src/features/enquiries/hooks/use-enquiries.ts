import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type {
  CreateCustomerEnquiryFormData,
  UpdateCustomerEnquiryFormData,
} from '@jg-app/validators'

const api = client as any

export function useEnquiries() {
  return useQuery({
    queryKey: ['enquiries'],
    queryFn: () =>
      api.api.enquiries.$get().then((response: Response) => response.json()) as Promise<{
        data: {
          id: number
          customerName: string
          mobile: string
          siteLocation: string | null
          materialInterest: string
          sizeOrUnit: string | null
          quantity: number | string | null
          quotedPrice: number | string | null
          notes: string | null
          status: 'NEW' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST'
          isActive: boolean
        }[]
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['enquiries'] }),
  })
}
