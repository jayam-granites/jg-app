import { useQuery } from '@tanstack/react-query'
import { client } from '@/lib/api'
import type { LookupOption, LookupOptionGroups, AppSettings } from '@jg-app/shared'

const api = client as any

export const OPTION_COLOR_CLASSES: Record<string, string> = {
  default: 'border-transparent bg-primary text-primary-foreground',
  secondary: 'border-transparent bg-secondary text-secondary-foreground',
  destructive: 'border-transparent bg-destructive text-destructive-foreground',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
}

export function optionColorClasses(option?: Pick<LookupOption, 'color'> | null) {
  return OPTION_COLOR_CLASSES[option?.color ?? ''] ?? ''
}

export function lookupOptionMap(options: LookupOption[]) {
  return new Map(options.map((o) => [o.value, o]))
}

export function useLookupOptions(group?: string) {
  return useQuery({
    queryKey: ['masters', 'options', group || 'all'],
    queryFn: () =>
      api.api.masters.options
        .$get({ query: group ? { group } : {} })
        .then((r: Response) => r.json()) as Promise<{ data: LookupOptionGroups }>,
  })
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['masters', 'settings'],
    queryFn: () =>
      api.api.masters.settings
        .$get()
        .then((r: Response) => r.json()) as Promise<{ data: AppSettings }>,
  })
}