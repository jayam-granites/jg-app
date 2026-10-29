import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => client.api.users.$get().then((r) => r.json()),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.api.users.$post({ json: data as never }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
}
