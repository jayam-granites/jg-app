import { useCallback } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ProductImportJob } from '@jg-app/shared'
import { api } from '@/lib/api'

const baseUrl = (import.meta as any).env?.VITE_API_URL ?? ''
const MAX_IMPORT_FILE_SIZE = 9 * 1024 * 1024

export type UploadProductImportInput = { file: File }
export type UploadProductImportResult = { jobId: string; statusUrl: string }
export type CommitProductImportInput = { jobId: string }
export type CommitProductImportResult = { jobId: string }

type ApiErrorBody = { error?: { message?: string }; message?: string }

/**
 * The import endpoints are mounted on the products router by the API module.
 * This local RPC shape keeps the client independent of generated route types.
 */
type ImportRpc = {
  validate: {
    $post: (args: { json: { fileName: string; fileBase64: string } }) => Promise<Response>
  }
  commit: {
    $post: (args: { json: { jobId: string } }) => Promise<Response>
  }
  jobs: {
    ':jobId': {
      $get: (args: { param: { jobId: string } }) => Promise<Response>
    }
  }
}

const productsApi = api.products as unknown as { import: ImportRpc }

async function errorMessageFromResponse(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as ApiErrorBody
    return body.error?.message ?? body.message ?? fallback
  } catch {
    return fallback
  }
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await errorMessageFromResponse(response, fallbackMessage))
  }
  return (await response.json()) as T
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = () => reject(new Error('Could not read the selected file'))
    reader.readAsDataURL(file)
  })
}

export function useDownloadProductImportTemplate() {
  return useCallback(async () => {
    const response = await fetch(`${baseUrl}/api/products/import/template`, {
      credentials: 'include',
    })
    if (!response.ok) {
      throw new Error(await errorMessageFromResponse(response, 'Failed to download the template'))
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    try {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'product-import-template.xlsx'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    } finally {
      URL.revokeObjectURL(url)
    }
  }, [])
}

export function useUploadProductImport() {
  return useMutation<UploadProductImportResult, Error, UploadProductImportInput>({
    mutationFn: async ({ file }) => {
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Only .xlsx files are supported')
      }
      if (file.size > MAX_IMPORT_FILE_SIZE) {
        throw new Error('The file must be 9 MB or smaller')
      }

      const fileBase64 = await readFileAsBase64(file)
      const response = await productsApi.import.validate.$post({
        json: { fileName: file.name, fileBase64 },
      })
      const json = await readJson<{ data: UploadProductImportResult }>(
        response,
        'Failed to validate the file',
      )
      return json.data
    },
  })
}

export function useCommitProductImport() {
  return useMutation<CommitProductImportResult, Error, CommitProductImportInput>({
    mutationFn: async ({ jobId }) => {
      const response = await productsApi.import.commit.$post({ json: { jobId } })
      const json = await readJson<{ data: CommitProductImportResult }>(
        response,
        'Failed to commit the import',
      )
      return json.data
    },
  })
}

export function useProductImportJob(jobId: string | null) {
  return useQuery<ProductImportJob | null, Error>({
    queryKey: ['product-import-job', jobId],
    queryFn: async () => {
      const response = await productsApi.import.jobs[':jobId'].$get({
        param: { jobId: jobId! },
      })
      const json = await readJson<{ data: ProductImportJob | null }>(
        response,
        'Failed to load the import job',
      )
      return json.data
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'validating' || status === 'committing' ? 1000 : 5000
    },
  })
}
