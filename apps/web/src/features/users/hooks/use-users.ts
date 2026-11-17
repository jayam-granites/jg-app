import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { User, UserDto } from '@jg-app/shared'

type DataResponse<T> = { data: T }
type MessageResponse = { data: null; message: string }

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error?.message ?? 'Request failed')
  }
  return result
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => parseResponse<DataResponse<User[]>>(await client.api.users.$get()),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UserDto) =>
      parseResponse<DataResponse<User>>(await client.api.users.$post({ json: data })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserDto['role'] }) =>
      parseResponse<MessageResponse>(
        await client.api.users[':id'].$patch({ param: { id }, json: { role } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) =>
      parseResponse<MessageResponse>(await client.api.users[':id'].$delete({ param: { id } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useSetUserSuspended() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, isSuspended }: { id: string; isSuspended: boolean }) =>
      parseResponse<MessageResponse>(
        await client.api.users[':id'].suspension.$patch({ param: { id }, json: { isSuspended } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUserPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) =>
      parseResponse<MessageResponse>(
        await client.api.users[':id'].password.$put({ param: { id }, json: { password } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
