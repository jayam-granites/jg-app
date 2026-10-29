import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateExpenseFormData, UpdateExpenseFormData } from '@jg-app/validators'

const api = client as any

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: () =>
      api.api.expenses.$get().then((r: Response) => r.json()) as Promise<{
        data: {
          id: number
          expenseNumber: string
          expenseDate: string
          categoryId: number
          expenseScheduleId: number | null
          amount: number
          fromDate: string | null
          toDate: string | null
          remarks: string | null
          paymentMode: string | null
          accountId: number | null
          referenceNumber: string | null
          isPurchaseExpense: boolean
          isPaid: boolean
          paidDate: string | null
          isActive: boolean
          category: { id: number; name: string }
          expenseSchedule: { id: number; title: string } | null
        }[]
      }>,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateExpenseFormData) => {
      const response = await api.api.expenses.$post({ json: data })
      if (!response.ok) {
        let message = 'Failed to create expense'
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateExpenseFormData }) => {
      const response = await api.api.expenses[':id'].$put({ param: { id: String(id) }, json: data })
      if (!response.ok) {
        let message = 'Failed to update expense'
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await (api.api.expenses[':id'].$delete({
        param: { id: String(id) },
      }) as Promise<Response>)
      if (!response.ok) {
        let message = 'Failed to delete expense'
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
