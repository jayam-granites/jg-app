export type LookupOption = {
  id: number
  group: string
  value: string
  label: string
  color: string | null
  sortOrder: number
  isActive: boolean
}

export type LookupOptionGroups = Record<string, LookupOption[]>

export type AppSettings = Record<string, string>