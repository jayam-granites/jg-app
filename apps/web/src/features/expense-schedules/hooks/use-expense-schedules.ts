import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateExpenseScheduleFormData, UpdateExpenseScheduleFormData } from '@jg-app/validators'

const api = client as any

export function useExpenseSchedules() {
  return useQuery({
    queryKey: ['expense-schedules'],
    queryFn: () =>
      api.api['expense-schedules'].$get().then((r: Response) => r.json()) as Promise<{
        data: {
          id: number
          title: string
          categoryId: number
          frequency: string
          amount: number | null
          startDate: string
          endDate: string | null
          intervalDays: number | null
          remarks: string | null
          isActive: boolean
          category: { id: number; name: string }
        }[]
      }>,
  })
}

export function useCreateExpenseSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExpenseScheduleFormData) => {
      const response = await api.api['expense-schedules'].$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create expense schedule'
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
      queryClient.invalidateQueries({ queryKey: ['expense-schedules'] })
    },
  })
}

export function useUpdateExpenseSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateExpenseScheduleFormData }) => {
      const response = await api.api['expense-schedules'][':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update expense schedule'
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
      queryClient.invalidateQueries({ queryKey: ['expense-schedules'] })
    },
  })
}
