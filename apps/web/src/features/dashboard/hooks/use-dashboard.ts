import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { DashboardData } from '../types'

export function useDashboard(months: number) {
  return useQuery({
    queryKey: ['dashboard', months],
    queryFn: async () => {
      const res = await (client.api.dashboard.$get({
        query: { months: String(months) },
      }) as Promise<Response>)
      const json = (await res.json()) as { data?: DashboardData; error?: { message?: string } }
      if (!res.ok || !json.data) {
        throw new Error(json.error?.message ?? 'Failed to load dashboard')
      }
      return json.data
    },
  })
}
