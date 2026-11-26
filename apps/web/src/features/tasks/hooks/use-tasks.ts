import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { CreateTaskFormData, UpdateTaskFormData } from '@jg-app/validators'

const api = client as any

type RelatedContact = {
  id: number
  name: string
  mobile: string | null
}

export type TaskRecord = {
  id: number
  title: string
  description: string | null
  dueDate: string
  priority: NonNullable<CreateTaskFormData['priority']>
  status: NonNullable<CreateTaskFormData['status']>
  enquiryId: number | null
  resourceId: number | null
  customerId: number | null
  supplierId: number | null
  brokerId: number | null
  transportId: number | null
  enquiry: { id: number; customerName: string; mobile: string | null } | null
  resource: RelatedContact | null
  customer: RelatedContact | null
  supplier: RelatedContact | null
  broker: RelatedContact | null
  transport: RelatedContact | null
}

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'],
    queryFn: () =>
      api.api.tasks.$get().then((response: Response) => response.json()) as Promise<{
        data: TaskRecord[]
      }>,
  })
}

export function useCreateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateTaskFormData) => {
      const response = await api.api.tasks.$post({ json: data })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to create task')
      }
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useUpdateTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTaskFormData }) => {
      const response = await api.api.tasks[':id'].$put({
        param: { id: String(id) },
        json: data,
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error?.message ?? 'Failed to update task')
      }
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

export function useArchiveTask() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.api.tasks[':id'].$delete({
        param: { id: String(id) },
      })
      if (!response.ok) throw new Error('Failed to archive task')
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  })
}
