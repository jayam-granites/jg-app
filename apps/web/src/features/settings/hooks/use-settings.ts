import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { client } from '@/lib/api'

export type CompanyProfile = {
  id: number
  companyName: string
  address: string | null
  logoUrl: string | null
  website: string | null
  primaryPhone: string | null
  secondaryPhone: string | null
  email: string | null
  gstNumber: string | null
  panNumber: string | null
  tanNumber: string | null
  bankName: string | null
  accountHolderName: string | null
  accountNumber: string | null
  ifscCode: string | null
  branch: string | null
  upiId: string | null
  upiQrUrl: string | null
  updatedAt: string
}

export type ConfigurationType = 'string' | 'number' | 'boolean' | 'select' | 'json'
export type ConfigurationOption = { label: string; value: string }
export type SystemConfiguration = {
  id: string
  configKey: string
  configLabel: string
  configValue: string
  dataType: ConfigurationType
  options: ConfigurationOption[] | null
  category: string
  description: string | null
  updatedAt: string
}

export type CompanyProfileUpdate = Partial<Record<
  Exclude<keyof CompanyProfile, 'id' | 'updatedAt'>,
  string
>>

export type ConfigurationInput = {
  configKey: string
  configLabel: string
  configValue: string
  dataType: ConfigurationType
  options?: ConfigurationOption[]
  category?: string
  description?: string
}

type DataResponse<T> = { data: T }
type MessageResponse = { data: null; message: string }

async function parseResponse<T>(response: Response): Promise<T> {
  const result = await response.json()
  if (!response.ok) throw new Error(result.error?.message ?? 'Request failed')
  return result
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => parseResponse<DataResponse<CompanyProfile>>(
      await client.api.settings.profile.$get(),
    ),
  })
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CompanyProfileUpdate) =>
      parseResponse<DataResponse<CompanyProfile>>(
        await client.api.settings.profile.$put({ json: data }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'profile'] }),
  })
}

export function useSystemConfigurations() {
  return useQuery({
    queryKey: ['settings', 'system-configurations'],
    queryFn: async () =>
      parseResponse<DataResponse<SystemConfiguration[]>>(
        await client.api.settings['system-configurations'].$get(),
      ),
  })
}

export function useSaveSystemConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ConfigurationInput & { id?: string }) => {
      const { id, ...data } = input
      const response = id
        ? await client.api.settings['system-configurations'][':id'].$put({
            param: { id },
            json: data,
          })
        : await client.api.settings['system-configurations'].$post({ json: data })
      return parseResponse<DataResponse<SystemConfiguration>>(response)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'system-configurations'] }),
  })
}

export function useDeleteSystemConfiguration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      parseResponse<MessageResponse>(
        await client.api.settings['system-configurations'][':id'].$delete({ param: { id } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'system-configurations'] }),
  })
}
